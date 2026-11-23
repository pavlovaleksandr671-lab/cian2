import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Checkbox,
  Icon,
  Input,
  Modal,
  Radio,
  Select,
  Skeleton,
  Spinner,
  Text,
  Tooltip,
  buttonThemes,
  type ButtonTheme,
  type ControlSize,
  type TextVariant,
} from '@/ui';
import s from './UIKitPage.module.css';

const sections = [
  ['buttons', 'Кнопки'],
  ['fields', 'Поля и выбор'],
  ['feedback', 'Состояния'],
  ['typography', 'Типографика'],
  ['tokens', 'Цвета и токены'],
  ['icons', 'Иконки'],
  ['usage', 'Использование'],
];
function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className={s.section} id={id}>
      <div className={s.sectionHeading}>
        <h2>{title}</h2>
        <p className="muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

export function UIKitPage({ prototype = false }: { prototype?: boolean }) {
  const [theme, setTheme] = useState<ButtonTheme>('main_primary');
  const [size, setSize] = useState<ControlSize>('M');
  const [dark, setDark] = useState(false);
  const [checked, setChecked] = useState(true);
  const [rooms, setRooms] = useState('2');
  const [modal, setModal] = useState(false);
  const [searchName, setSearchName] = useState('Квартира рядом с парком');
  const [message, setMessage] = useState('');
  useEffect(() => {
    document.documentElement.classList.toggle('design-theme--dark', dark);
    document.documentElement.classList.toggle('design-theme--light', !dark);
    return () => {
      document.documentElement.classList.remove('design-theme--dark');
      document.documentElement.classList.add('design-theme--light');
    };
  }, [dark]);
  return (
    <div className={s.workspace}>
      <a className="skip-link" href="#kit-main">
        К содержимому
      </a>
      <header className={s.header}>
        <div className="row">
          <Link to="/auction">Аукцион квартиры →</Link>
          <span className={s.mark}>Ц</span>
          <strong>
            Циан <span className="muted">/ UI kit</span>
          </strong>
          <Badge tone="main">React</Badge>
        </div>
        <div className="row">
          {prototype && <Link to="/">К прототипу</Link>}
          <Button
            size="XS"
            theme="stroke_secondary"
            aria-pressed={dark}
            onClick={() => setDark(!dark)}
          >
            {dark ? 'Светлая тема' : 'Тёмная тема'}
          </Button>
        </div>
      </header>
      <div className={s.body}>
        <aside className={s.sidebar}>
          <span className={s.eyebrow}>КОМПОНЕНТЫ</span>
          <nav aria-label="Разделы UI kit">
            {sections.map(([id, title]) => (
              <a key={id} href={`#${id}`}>
                {title}
              </a>
            ))}
          </nav>
          <a href="/reference/" className={s.sourceLink}>
            Исходный справочник <Icon name="ActionArrowUpRight16" size={16} />
          </a>
          <p>
            Снимок сайта
            <br />
            12 ноября 2026
          </p>
        </aside>
        <main id="kit-main" className={s.main}>
          <div className={s.intro}>
            <Badge tone="main">Основа для интерфейсов</Badge>
            <h1>
              Компоненты Циана.
              <br />
              Готовы к работе.
            </h1>
            <p>
              Рабочие React-компоненты на токенах и стилях сайта. Изучайте состояния, меняйте
              параметры и используйте в своём экране.
            </p>
            <div className={s.metrics}>
              <span>
                <strong>526</strong> токенов
              </span>
              <span>
                <strong>24</strong> исходные иконки
              </span>
              <span>
                <strong>Lato</strong> локально
              </span>
            </div>
          </div>
          <Section id="buttons" title="Кнопки" note="11 тем · три размера · нативные состояния">
            <div className={s.controls}>
              <Select
                label="Тема"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ButtonTheme)}
                options={buttonThemes.map((value) => ({ value, label: value }))}
              />
              <Select
                label="Размер"
                value={size}
                onChange={(e) => setSize(e.target.value as ControlSize)}
                options={['XS', 'M', 'L'].map((value) => ({ value, label: value }))}
              />
            </div>
            <div className={s.demo}>
              <Button theme={theme} size={size} onClick={() => setMessage('Кнопка работает')}>
                Показать объявления
              </Button>
              <Button
                theme={theme}
                size={size}
                beforeIcon="ActionSearch16"
                onClick={() => setMessage('Поиск запущен в примере')}
              >
                Найти
              </Button>
              <Button theme={theme} size={size} disabled>
                Недоступно
              </Button>
              <Button theme={theme} size={size} loading>
                Загрузка
              </Button>
            </div>
            <pre>{`<Button theme="${theme}" size="${size}">Показать объявления</Button>`}</pre>
          </Section>
          <Section
            id="fields"
            title="Поля и выбор"
            note="Подписи, подсказки, ошибки и управление с клавиатуры"
          >
            <div className={s.fieldGrid}>
              <Input
                label="Город, район или метро"
                placeholder="Например, Сокольники"
                leadingIcon="ActionSearch16"
                hint="Введите адрес или название района"
              />
              <Input
                label="Стоимость до, ₽"
                defaultValue="Десять миллионов"
                error="Укажите стоимость числом"
              />
              <Input label="Недоступное поле" value="Москва" disabled />
            </div>
            <div className={s.demo}>
              <fieldset>
                <legend>Комнатность</legend>
                <div className="row">
                  {['Студия', '1', '2', '3', '4+'].map((value) => (
                    <Radio
                      key={value}
                      name="kit-rooms"
                      value={value}
                      label={value}
                      checked={rooms === value}
                      onChange={() => setRooms(value)}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="row">
              <Checkbox
                label="Только с фотографиями"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <Checkbox label="Без комиссии" />
              <Checkbox label="Недоступно" disabled />
            </div>
          </Section>
          <Section
            id="feedback"
            title="Состояния и обратная связь"
            note="Метки, загрузка, подсказки и диалог"
          >
            <div className="row">
              <Badge tone="positive">Хорошая цена</Badge>
              <Badge tone="main">Только на Циан</Badge>
              <Badge tone="warning">Снижение цены</Badge>
              <Badge>Проверено</Badge>
            </div>
            <div className={s.demo}>
              <div className={s.skeleton}>
                <Skeleton width="70%" height={24} />
                <Skeleton />
                <Skeleton width="85%" />
              </div>
              <Spinner size={32} />
              <Tooltip text="Подсказка доступна при наведении, фокусе и нажатии. Escape закрывает её." />
              <Button theme="main_secondary" onClick={() => setModal(true)}>
                Сохранить поиск
              </Button>
            </div>
          </Section>
          <Section
            id="typography"
            title="Типографика"
            note="Lato 400 / 600 / 700 · исходная шкала UI kit"
          >
            <div className="stack">
              {(
                [
                  'UIHeading1',
                  'UIHeading2',
                  'UIHeading3',
                  'UIHeading4',
                  'UIHeading5',
                  'UIHeading6',
                  'Body1',
                  'Body2',
                  'Caption',
                ] as TextVariant[]
              ).map((variant) => (
                <div className={s.typeRow} key={variant}>
                  <code>{variant}</code>
                  <Text variant={variant}>Найдите место для жизни</Text>
                </div>
              ))}
            </div>
          </Section>
          <Section
            id="tokens"
            title="Цвета и токены"
            note="Семантические имена связывают назначение и цвет"
          >
            <div className={s.palette}>
              {[
                ['--control-main-primary-default', 'Основное действие'],
                ['--text-primary-default', 'Основной текст'],
                ['--text-secondary-default', 'Вторичный текст'],
                ['--background-secondary', 'Вторичный фон'],
                ['--surface-main-default', 'Акцентная подложка'],
                ['--stroke-border-default', 'Граница'],
              ].map(([token, label]) => (
                <div key={token}>
                  <span className={s.swatch} style={{ background: `var(${token})` }} />
                  <strong>{label}</strong>
                  <code>{token}</code>
                </div>
              ))}
            </div>
            <div className="row">
              <a href="/reference/#tokens">Все 526 токенов →</a>
              <a href="/reference/tokens/tokens.json" download>
                Скачать JSON
              </a>
              <a href="/reference/tokens/cian-design-tokens.zip" download>
                Скачать архив
              </a>
            </div>
          </Section>
          <Section
            id="icons"
            title="Иконки"
            note="Оригинальные SVG доступны в исходном справочнике"
          >
            <div className={s.iconGrid}>
              {[
                'ActionSearch16',
                'ActionMap16',
                'ActionPlus16',
                'ActionClose16',
                'ActionProfile24',
                'FunctionalCalendar24',
                'ActionChevronRight16',
                'FunctionalSuccess16',
                'FunctionalInformationCircle16',
                'MapLocation16',
              ].map((name) => (
                <div key={name}>
                  <Icon name={name} size={24} />
                  <code>{name}</code>
                </div>
              ))}
            </div>
          </Section>
          <Section
            id="usage"
            title="Использование"
            note="Один импорт — одинаковые компоненты во всех экранах"
          >
            <pre>{`import { Button, Input, Badge } from '@/ui';\n\n<Input label="Район" placeholder="Сокольники" />\n<Button theme="main_primary">Найти</Button>\n<Badge tone="positive">Хорошая цена</Badge>`}</pre>
            <p className="muted">
              Это учебная адаптация снимка публичного сайта, а не официальный npm-пакет Циана.
              Точные источники, ограничения и различия API описаны в документации проекта.
            </p>
          </Section>
          <footer className={s.bottom}>
            Циан · рабочее место для практики{' '}
            <a href="/reference/">Источники и полный справочник ↗</a>
          </footer>
        </main>
      </div>
      <div role="status" className={s.status}>
        {message}
      </div>
      <Modal open={modal} title="Сохранить поиск" onClose={() => setModal(false)}>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(`Поиск «${searchName}» сохранён в примере`);
            setModal(false);
          }}
        >
          <Input
            label="Название поиска"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" fullWidth>
            Сохранить
          </Button>
        </form>
      </Modal>
    </div>
  );
}
