import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuctionPage } from './AuctionPage';

function renderAuction() {
  render(
    <MemoryRouter>
      <AuctionPage />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('auction user journeys', () => {
  it('publishes seller terms, accepts a buyer bid, and shares it between roles', async () => {
    const user = renderAuction();
    await user.click(screen.getByRole('button', { name: /Настроить аукцион/ }));
    const price = screen.getByLabelText('Стартовая цена, ₽');
    await user.clear(price);
    await user.type(price, 'не число');
    await user.click(screen.getByRole('button', { name: /Проверить условия/ }));
    expect(price).toHaveAttribute('aria-invalid', 'true');
    await user.clear(price);
    await user.type(price, '12500000');
    await user.click(screen.getByRole('button', { name: /Проверить условия/ }));
    const publish = screen.getByRole('button', { name: 'Опубликовать аукцион' });
    expect(publish).toBeDisabled();
    await user.click(screen.getByLabelText('Я проверил условия и готов опубликовать аукцион'));
    await user.click(publish);
    expect(screen.getByText(/Аукцион опубликован/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Я покупатель' }));
    await user.click(screen.getByRole('button', { name: /Сделать ставку/ }));
    let dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByLabelText('Сумма ставки, ₽')).toHaveValue('12 500 000');
    await user.click(dialog.getByRole('button', { name: 'Продолжить' }));
    dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: /Подтвердить 12/ }));
    expect(dialog.getByRole('button', { name: /Отправляем ставку/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Я продавец' })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 2500,
    });
    expect(screen.getByText('Ваша ставка лидирует')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Я продавец' }));
    expect(
      within(screen.getByRole('region', { name: 'История ставок' })).getByText(
        'Покупатель из прототипа',
      ),
    ).toBeVisible();
    expect(screen.getByText('1 ставка')).toBeVisible();
    await user.click(screen.getByText('Управление прототипом'));
    await user.click(screen.getByRole('button', { name: 'Завершить аукцион' }));
    await user.click(screen.getByRole('button', { name: 'Я покупатель' }));
    expect(screen.getByText('Ваша ставка победила')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Связаться с продавцом' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Продавец квартиры');
    expect(within(screen.getByRole('dialog')).getByText(/Сценарий аукциона пройден/)).toBeVisible();
  });

  it('handles low bids, network errors, retries, outbidding and a completed auction', async () => {
    const user = renderAuction();
    await user.click(screen.getByText('Управление прототипом'));
    await user.click(screen.getByRole('button', { name: 'Открыть демо-аукцион' }));
    await user.click(screen.getByLabelText('Ошибка следующей отправки'));
    await user.click(screen.getByRole('button', { name: /Сделать ставку/ }));
    let dialog = within(screen.getByRole('dialog'));
    const amount = dialog.getByLabelText('Сумма ставки, ₽');
    await user.clear(amount);
    await user.type(amount, '100');
    await user.click(dialog.getByRole('button', { name: 'Продолжить' }));
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    await user.click(dialog.getByRole('button', { name: /Указать 12/ }));
    await user.click(dialog.getByRole('button', { name: 'Продолжить' }));
    dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: /Подтвердить 12/ }));
    await waitFor(
      () => expect(dialog.getByRole('alert')).toHaveTextContent('Не удалось отправить ставку'),
      { timeout: 2500 },
    );
    await user.click(dialog.getByRole('button', { name: 'Повторить отправку' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 2500,
    });
    expect(screen.getByText('Ваша ставка лидирует')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ставка другого покупателя' }));
    expect(screen.getByText('Вашу ставку перебили')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Завершить аукцион' }));
    expect(screen.getByRole('button', { name: 'Аукцион завершён' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Повысить ставку/ })).not.toBeInTheDocument();
  }, 12000);

  it('finishes without bids and resets back to the seller start', async () => {
    const user = renderAuction();
    await user.click(screen.getByRole('button', { name: /Настроить аукцион/ }));
    await user.click(screen.getByRole('button', { name: /Проверить условия/ }));
    await user.click(screen.getByLabelText('Я проверил условия и готов опубликовать аукцион'));
    await user.click(screen.getByRole('button', { name: 'Опубликовать аукцион' }));
    await user.click(screen.getByText('Управление прототипом'));
    await user.click(screen.getByRole('button', { name: 'Завершить аукцион' }));
    expect(screen.getByText(/Ставок не было/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Начать заново' }));
    expect(screen.getByRole('button', { name: /Настроить аукцион/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Я продавец' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
