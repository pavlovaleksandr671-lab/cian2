import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Checkbox, Icon, Input, Modal, Radio, Select, Text } from '@/ui';
import {
  auctionReducer,
  bidError,
  createDraft,
  defaultTerms,
  highestBid,
  isEnded,
  minimumBid,
  money,
  parseMoney,
  type Auction,
  type Role,
  type Terms,
} from './auctionModel';
import s from './AuctionPage.module.css';

type Screen = 'listing' | 'setup' | 'review' | 'auction';
type Submission = 'idle' | 'pending' | 'error';
const pictures = ['/auction/living-room.jpg', '/auction/interior.jpg'];
const endDate = (time: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(time);
const formatTime = (time: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(time);

function Clock({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function TermsList({ terms, endsAt }: { terms: Terms; endsAt?: number | null }) {
  return (
    <dl className={s.terms}>
      <div>
        <dt>Стартовая цена</dt>
        <dd>{money(terms.startPrice)}</dd>
      </div>
      <div>
        <dt>Шаг ставки</dt>
        <dd>{money(terms.step)}</dd>
      </div>
      <div>
        <dt>{endsAt ? 'Завершение' : 'Длительность'}</dt>
        <dd>
          {endsAt ? (
            <>
              {endDate(endsAt)}
              <span className={s.timezone}>МСК</span>
            </>
          ) : (
            `${terms.duration} ч`
          )}
        </dd>
      </div>
    </dl>
  );
}

function PropertySummary() {
  return (
    <div className={s.propertySummary}>
      <img src={pictures[0]} alt="Светлая гостиная квартиры" />
      <div>
        <strong>2-комн. квартира, 56 м²</strong>
        <p>Москва, ул. Лесная, 8</p>
        <span>
          <i /> Белорусская · 7 мин. пешком
        </span>
      </div>
    </div>
  );
}

function TimeLeft({ auction, now }: { auction: Auction; now: number }) {
  if (isEnded(auction, now)) return <span>Аукцион завершён</span>;
  const minutes = Math.min(
    auction.terms.duration * 60,
    Math.max(0, Math.ceil(((auction.endsAt ?? now) - now) / 60_000)),
  );
  return (
    <span>
      До конца {Math.floor(minutes / 60)} ч {String(minutes % 60).padStart(2, '0')} мин
    </span>
  );
}

export function AuctionPage() {
  const [auction, dispatch] = useReducer(auctionReducer, undefined, createDraft);
  const [role, setRole] = useState<Role>('seller');
  const [screen, setScreen] = useState<Screen>('listing');
  const [terms, setTerms] = useState<Terms>({ ...defaultTerms });
  const [startPrice, setStartPrice] = useState('12 000 000');
  const [formError, setFormError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [modal, setModal] = useState<'rules' | 'bid' | 'contact' | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submission, setSubmission] = useState<Submission>('idle');
  const [failNext, setFailNext] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const auctionRef = useRef(auction);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    auctionRef.current = auction;
  }, [auction]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    document.title = 'Аукцион квартиры · Циан';
  }, []);

  const ended = isEnded(auction, now);
  const topBid = highestBid(auction);
  const yourBid = auction.bids.find((bid) => bid.by === 'you');
  const leading = topBid?.by === 'you';
  const live = auction.status !== 'draft';
  const currentScreen = role === 'buyer' ? 'auction' : screen;
  const showListing =
    currentScreen === 'listing' || (currentScreen === 'auction' && role === 'buyer');

  function changeRole(next: Role) {
    if (inFlight.current) return;
    setRole(next);
    setModal(null);
    setNotice('');
  }
  function reset() {
    if (inFlight.current) return;
    dispatch({ type: 'reset' });
    setRole('seller');
    setScreen('listing');
    setTerms({ ...defaultTerms });
    setStartPrice('12 000 000');
    setAgreed(false);
    setModal(null);
    setNotice('');
    setAmountError('');
    setFormError('');
    setFailNext(false);
    setSubmission('idle');
    setFavorite(false);
    setPhoto(0);
  }
  function example() {
    dispatch({ type: 'example', now: Date.now() });
    setRole('buyer');
    setScreen('auction');
    setNotice('Демо-аукцион открыт. Можно сделать первую ставку.');
  }
  function nextStep(event: FormEvent) {
    event.preventDefault();
    const price = parseMoney(startPrice);
    if (!Number.isSafeInteger(price) || price < 100_000 || price > 1_000_000_000) {
      setFormError('Укажите целую сумму от 100 000 до 1 000 000 000 ₽.');
      return;
    }
    setTerms({ ...terms, startPrice: price });
    setFormError('');
    setScreen('review');
  }
  function publish() {
    if (!agreed) return;
    dispatch({ type: 'publish', terms, now: Date.now() });
    setScreen('auction');
    setNotice('Аукцион опубликован. Покупатели уже могут делать ставки.');
  }
  function openBid() {
    setAmount(new Intl.NumberFormat('ru-RU').format(minimumBid(auction)));
    setAmountError('');
    setSubmission('idle');
    setConfirming(false);
    setModal('bid');
  }
  function closeModal() {
    if (inFlight.current) return;
    setModal(null);
    setConfirming(false);
  }
  function reviewBid(event: FormEvent) {
    event.preventDefault();
    const error = bidError(auctionRef.current, parseMoney(amount));
    if (error) {
      setAmountError(error);
      return;
    }
    setAmountError('');
    setConfirming(true);
  }
  function sendBid() {
    if (inFlight.current) return;
    const submittedAmount = parseMoney(amount);
    const error = bidError(auctionRef.current, submittedAmount);
    if (error) {
      setAmountError(error);
      setConfirming(false);
      return;
    }
    inFlight.current = true;
    setSubmission('pending');
    setAmountError('');
    const shouldFail = failNext;
    setFailNext(false);
    timer.current = setTimeout(() => {
      inFlight.current = false;
      const responseError = bidError(auctionRef.current, submittedAmount);
      if (responseError) {
        setAmountError(responseError);
        setConfirming(false);
        setSubmission('idle');
        return;
      }
      if (shouldFail) {
        setSubmission('error');
        return;
      }
      dispatch({
        type: 'bid',
        amount: submittedAmount,
        by: 'you',
        now: Date.now(),
        id: crypto.randomUUID(),
      });
      setSubmission('idle');
      setModal(null);
      setConfirming(false);
      setNotice('Ставка принята. Сейчас ваше предложение — лучшее.');
    }, 1400);
  }
  function outbid() {
    dispatch({
      type: 'bid',
      amount: minimumBid(auction),
      by: 'other',
      now: Date.now(),
      id: crypto.randomUUID(),
    });
    setNotice('Другой покупатель сделал новую ставку. Цена обновлена.');
  }

  const steps =
    role === 'seller'
      ? ['Задайте условия', 'Проверьте и опубликуйте', 'Наблюдайте за ставками']
      : ['Изучите квартиру и условия', 'Предложите свою цену', 'Следите за своей ставкой'];
  const title =
    currentScreen === 'setup'
      ? 'Условия аукциона'
      : currentScreen === 'review'
        ? 'Проверьте условия'
        : role === 'seller'
          ? live
            ? 'Мой аукцион'
            : 'Моё объявление'
          : 'Квартира на аукционе';

  return (
    <div className={s.workspace}>
      <a className="skip-link" href="#auction-main">
        К прототипу
      </a>
      <header className={s.topbar}>
        <Link to="/" className={s.brand} aria-label="Циан — каталог компонентов">
          <span className={s.logo}>Ц</span>циан
        </Link>
        <span className={s.labLabel}>
          ЛАБОРАТОРИЯ <span>/</span> НОВЫЙ СЦЕНАРИЙ
        </span>
        <Link to="/" className={s.kitLink}>
          Дизайн-система <Icon name="ActionArrowUpRight16" size={16} />
        </Link>
      </header>
      <main id="auction-main" className={s.layout}>
        <aside className={s.sidebar}>
          <span className={s.eyebrow}>
            <span /> ЦИАН · АУКЦИОН
          </span>
          <h1>
            Хорошая квартира.
            <br />
            Лучшая <span>цена.</span>
          </h1>
          <p className={s.intro}>
            Новый способ встретиться продавцу
            <br className={s.desktopBreak} /> и покупателю. Открытые ставки,
            <br className={s.desktopBreak} /> понятные условия, ваша цена.
          </p>
          <div className={s.roleSection}>
            <p className={s.controlLabel}>ПОСМОТРЕТЬ СО СТОРОНЫ</p>
            <div className={s.roleSwitch} role="group" aria-label="Роль в прототипе">
              <button
                type="button"
                aria-pressed={role === 'seller'}
                disabled={submission === 'pending'}
                onClick={() => changeRole('seller')}
              >
                <Icon name="PlaceholderUser16" size={18} /> Я продавец
              </button>
              <button
                type="button"
                aria-pressed={role === 'buyer'}
                disabled={submission === 'pending'}
                onClick={() => changeRole('buyer')}
              >
                <Icon name="ActionSearch16" size={18} /> Я покупатель
              </button>
            </div>
            <ol className={s.journey}>
              {steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <details className={s.demoPanel}>
            <summary>
              <span>
                <Icon name="Menu" size={17} /> Управление прототипом
              </span>
              <Icon name="ActionChevronDownSmall16" size={16} />
            </summary>
            <p>
              Проверьте разные исходы. Действия меняют только эту демонстрацию. Обновление страницы
              сбрасывает аукцион.
            </p>
            <div className={s.demoButtons}>
              <Button
                size="XS"
                theme="stroke_secondary"
                disabled={live || submission === 'pending'}
                onClick={example}
              >
                Открыть демо-аукцион
              </Button>
              <Button size="XS" theme="stroke_secondary" disabled={!live || ended} onClick={outbid}>
                Ставка другого покупателя
              </Button>
              <Button
                size="XS"
                theme="stroke_secondary"
                disabled={!live || ended}
                onClick={() => {
                  dispatch({ type: 'end' });
                  setNotice('Аукцион завершён. Результат доступен обеим сторонам.');
                }}
              >
                Завершить аукцион
              </Button>
              <Checkbox
                label="Ошибка следующей отправки"
                checked={failNext}
                disabled={!live || ended || submission === 'pending'}
                onChange={(e) => setFailNext(e.target.checked)}
              />
              <button className={s.reset} onClick={reset} disabled={submission === 'pending'}>
                Начать заново
              </button>
            </div>
          </details>
          <div className={s.sidebarFooter}>
            <span className={s.smallDot} /> Кликабельный прототип{' '}
            <span>
              {role === 'seller'
                ? live
                  ? '03'
                  : currentScreen === 'review'
                    ? '02'
                    : '01'
                : yourBid
                  ? '03'
                  : '01'}{' '}
              / 03
            </span>
          </div>
        </aside>

        <section className={s.preview} aria-label="Мобильное приложение Циана">
          <div className={s.phone}>
            <div className={s.statusbar} aria-hidden="true">
              <strong>9:41</strong>
              <span className={s.notch} />
              <span className={s.statusIcons}>
                ▮▮▮ <span>◔</span> ▰
              </span>
            </div>
            <div className={s.appHeader}>
              <button
                className={s.iconButton}
                aria-label={
                  currentScreen === 'setup' || currentScreen === 'review'
                    ? 'Назад'
                    : 'Информация об аукционе'
                }
                onClick={() => {
                  if (currentScreen === 'review') setScreen('setup');
                  else if (currentScreen === 'setup') setScreen('listing');
                  else setModal('rules');
                }}
              >
                <Icon name="ActionChevronLeft16" size={22} />
              </button>
              <strong>{title}</strong>
              <button
                className={`${s.iconButton} ${favorite ? s.favorite : ''}`}
                aria-label={favorite ? 'Удалить из избранного' : 'В избранное'}
                aria-pressed={favorite}
                onClick={() => setFavorite(!favorite)}
              >
                <Icon name="Heart" size={21} />
              </button>
            </div>
            <div className={s.appContent}>
              {notice && (
                <div className={s.notice} role="status">
                  <Icon name="FunctionalSuccess16" size={18} />
                  <span>{notice}</span>
                  <button aria-label="Скрыть уведомление" onClick={() => setNotice('')}>
                    <Icon name="ActionClose16" size={16} />
                  </button>
                </div>
              )}

              {showListing && (
                <>
                  <div className={s.gallery}>
                    <img
                      src={pictures[photo]}
                      alt={
                        photo === 0
                          ? 'Светлая гостиная: диван, кресла и большие окна'
                          : 'Интерьер квартиры с натуральными материалами'
                      }
                    />
                    <span className={s.photoTag}>
                      <span /> {role === 'seller' ? 'Ваше объявление' : 'Аукцион'}
                    </span>
                    <button
                      className={`${s.photoArrow} ${s.photoPrev}`}
                      aria-label="Предыдущее фото"
                      onClick={() => setPhoto((photo + pictures.length - 1) % pictures.length)}
                    >
                      <Icon name="ActionChevronLeft16" size={18} />
                    </button>
                    <button
                      className={s.photoArrow}
                      aria-label="Следующее фото"
                      onClick={() => setPhoto((photo + 1) % pictures.length)}
                    >
                      <Icon name="ActionChevronRight16" size={18} />
                    </button>
                    <span className={s.photoCount}>
                      {photo + 1} / {pictures.length}
                    </span>
                    <div className={s.photoDots} aria-hidden="true">
                      {pictures.map((_, index) => (
                        <i key={index} className={index === photo ? s.activeDot : ''} />
                      ))}
                    </div>
                  </div>
                  <div className={s.propertyInfo}>
                    <div className={s.propertyTitleRow}>
                      <Text as="h2" variant="UIHeading2">
                        2-комн. квартира, 56 м²
                      </Text>
                      <span className={s.verified} title="Учебное объявление">
                        <Icon name="FunctionalSuccess16" size={14} />
                      </span>
                    </div>
                    <p className={s.address}>Москва, ул. Лесная, 8</p>
                    <p className={s.metro}>
                      <i /> Белорусская <span>· 7 мин. пешком</span>
                    </p>
                    <div className={s.propertyFacts}>
                      <span>
                        56 м² <small>общая</small>
                      </span>
                      <span>
                        32 м² <small>жилая</small>
                      </span>
                      <span>
                        8 из 16 <small>этаж</small>
                      </span>
                    </div>
                  </div>
                </>
              )}

              {currentScreen === 'listing' && (
                <>
                  <div className={s.sellerPromo}>
                    <span className={s.promoIcon}>
                      <Icon name="ActionArrowUpRight16" size={23} />
                    </span>
                    <Badge tone="main">Новый способ продажи</Badge>
                    <h3>
                      Пусть покупатели
                      <br />
                      предложат свою цену
                    </h3>
                    <p>
                      Задайте стартовую цену и срок.
                      <br />
                      Покупатели сделают ставки —<br />
                      вы увидите лучшее предложение.
                    </p>
                    <button className={s.textButton} onClick={() => setModal('rules')}>
                      Как работает аукцион <Icon name="ActionChevronRight16" size={15} />
                    </button>
                  </div>
                  <div className={s.bottomAction}>
                    <Button
                      fullWidth
                      size="L"
                      onClick={() => {
                        setScreen('setup');
                        setNotice('');
                      }}
                    >
                      Настроить аукцион <Icon name="ActionChevronRight16" size={18} />
                    </Button>
                    <p>Вы проверите условия перед публикацией</p>
                  </div>
                </>
              )}

              {currentScreen === 'setup' && (
                <form onSubmit={nextStep} noValidate>
                  <div className={s.formContent}>
                    <div className={s.stepLabel}>
                      ШАГ 1 ИЗ 2{' '}
                      <span>
                        <i className={s.filledStep} />
                        <i />
                      </span>
                    </div>
                    <Text as="h2" variant="UIHeading2">
                      Начните с вашей цены
                    </Text>
                    <p className={s.muted}>Вы задаёте правила. Покупатели предлагают больше.</p>
                    <PropertySummary />
                    <Input
                      className={s.moneyField}
                      label="Стартовая цена, ₽"
                      inputMode="numeric"
                      value={startPrice}
                      error={formError || undefined}
                      hint="Минимальная сумма первой ставки"
                      onChange={(e) => {
                        setStartPrice(e.target.value);
                        setFormError('');
                      }}
                    />
                    <fieldset className={s.stepField}>
                      <legend>Минимальный шаг ставки</legend>
                      <div className={s.stepChoices}>
                        {[50_000, 100_000, 200_000].map((value) => (
                          <Radio
                            key={value}
                            label={money(value)}
                            name="bid-step"
                            value={value}
                            checked={terms.step === value}
                            onChange={() => setTerms({ ...terms, step: value })}
                          />
                        ))}
                      </div>
                      <p className={s.caption}>
                        Каждая новая ставка должна быть выше минимум на этот шаг.
                      </p>
                    </fieldset>
                    <Select
                      label="Длительность аукциона"
                      value={String(terms.duration)}
                      options={[
                        { value: '24', label: '24 часа' },
                        { value: '72', label: '3 дня' },
                        { value: '168', label: '7 дней' },
                      ]}
                      onChange={(e) => setTerms({ ...terms, duration: Number(e.target.value) })}
                    />
                    <div className={s.infoBox}>
                      <Clock />
                      <p>
                        Аукцион начнётся сразу после публикации. Условия будут видны всем
                        участникам.
                      </p>
                    </div>
                  </div>
                  <div className={s.bottomAction}>
                    <Button fullWidth size="L" type="submit">
                      Проверить условия <Icon name="ActionChevronRight16" size={18} />
                    </Button>
                  </div>
                </form>
              )}

              {currentScreen === 'review' && (
                <>
                  <div className={s.formContent}>
                    <div className={s.stepLabel}>
                      ШАГ 2 ИЗ 2{' '}
                      <span>
                        <i className={s.filledStep} />
                        <i className={s.filledStep} />
                      </span>
                    </div>
                    <Text as="h2" variant="UIHeading2">
                      Всё готово к старту
                    </Text>
                    <p className={s.muted}>Убедитесь, что условия вам подходят.</p>
                    <PropertySummary />
                    <div className={s.reviewCard}>
                      <Badge tone="main">Ваш аукцион</Badge>
                      <TermsList terms={terms} />
                      <button className={s.textButton} onClick={() => setScreen('setup')}>
                        Изменить условия
                      </button>
                    </div>
                    <div className={s.infoBox}>
                      <Icon name="FunctionalInformationCircle16" size={20} />
                      <p>
                        После публикации цену, шаг и срок изменить нельзя. По окончании вы увидите
                        лучшее предложение.
                      </p>
                    </div>
                    <Checkbox
                      label="Я проверил условия и готов опубликовать аукцион"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                  </div>
                  <div className={s.bottomAction}>
                    <Button fullWidth size="L" disabled={!agreed} onClick={publish}>
                      Опубликовать аукцион
                    </Button>
                    <p>Без оплаты и оформления сделки</p>
                  </div>
                </>
              )}

              {currentScreen === 'auction' && (
                <>
                  {role === 'seller' && (
                    <div className={s.ownerHeader}>
                      <PropertySummary />
                      <Badge tone={ended ? 'neutral' : 'positive'}>
                        {ended ? 'Завершён' : 'Опубликован'}
                      </Badge>
                    </div>
                  )}
                  {!live ? (
                    <div className={s.unpublished}>
                      <Badge>Предпросмотр</Badge>
                      <h3>Скоро здесь начнутся торги</h3>
                      <p>
                        Продавец ещё не опубликовал аукцион. Переключитесь на роль продавца и
                        задайте условия или изучите готовый пример.
                      </p>
                      <Button fullWidth onClick={example}>
                        Посмотреть демо-аукцион
                      </Button>
                    </div>
                  ) : (
                    <>
                      <section className={s.auctionCard} aria-label="Условия и статус аукциона">
                        <div className={`${s.countdown} ${ended ? s.finishedCountdown : ''}`}>
                          <Clock size={16} />
                          <TimeLeft auction={auction} now={now} />
                          <span className={s.liveDot} />
                        </div>
                        <p className={s.priceLabel}>
                          {ended
                            ? topBid
                              ? 'Итоговая ставка'
                              : 'Стартовая цена'
                            : topBid
                              ? 'Текущая ставка'
                              : 'Стартовая цена'}
                        </p>
                        <div className={s.priceRow}>
                          <strong>{money(topBid?.amount ?? auction.terms.startPrice)}</strong>
                          <span>
                            {auction.bids.length}{' '}
                            {auction.bids.length === 1
                              ? 'ставка'
                              : auction.bids.length > 1 && auction.bids.length < 5
                                ? 'ставки'
                                : 'ставок'}
                          </span>
                        </div>
                        {role === 'buyer' && yourBid && (
                          <div
                            className={`${s.bidStatus} ${leading ? s.positive : s.warning}`}
                            role="status"
                          >
                            <Icon
                              name={
                                leading ? 'FunctionalSuccess16' : 'FunctionalInformationCircle16'
                              }
                              size={18}
                            />
                            <div>
                              <strong>
                                {ended
                                  ? leading
                                    ? 'Ваша ставка победила'
                                    : 'Аукцион завершён'
                                  : leading
                                    ? 'Ваша ставка лидирует'
                                    : 'Вашу ставку перебили'}
                              </strong>
                              <p>
                                {ended
                                  ? leading
                                    ? 'Свяжитесь с продавцом, чтобы обсудить следующие шаги.'
                                    : `Лучшее предложение — ${money(topBid.amount)}.`
                                  : leading
                                    ? `Вы предложили ${money(yourBid.amount)}`
                                    : `Ваша ставка — ${money(yourBid.amount)}`}
                              </p>
                            </div>
                          </div>
                        )}
                        {ended && !yourBid && (
                          <div className={s.infoBox}>
                            <Icon name="FunctionalInformationCircle16" size={20} />
                            <p>
                              {topBid
                                ? role === 'seller'
                                  ? 'Лучшее предложение получено. Свяжитесь с участником, чтобы обсудить продажу.'
                                  : 'Торги окончены. Вы не участвовали в этом аукционе.'
                                : 'Ставок не было. Продавец может попробовать провести новый аукцион.'}
                            </p>
                          </div>
                        )}
                        <TermsList terms={auction.terms} endsAt={auction.endsAt} />
                        <button className={s.textButton} onClick={() => setModal('rules')}>
                          Как проходит аукцион <Icon name="ActionChevronRight16" size={15} />
                        </button>
                      </section>
                      {role === 'buyer' && (
                        <div className={s.bottomAction}>
                          {ended ? (
                            <>
                              <Button
                                fullWidth
                                size="L"
                                disabled={!leading}
                                onClick={() => setModal('contact')}
                              >
                                {leading ? 'Связаться с продавцом' : 'Аукцион завершён'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button fullWidth size="L" onClick={openBid}>
                                {yourBid ? 'Повысить ставку' : 'Сделать ставку'}
                                <Icon name="ActionArrowUpRight16" size={20} />
                              </Button>
                              <p>Следующая ставка от {money(minimumBid(auction))}</p>
                            </>
                          )}
                        </div>
                      )}
                      {role === 'seller' && (
                        <div className={s.bottomAction}>
                          <Button
                            fullWidth
                            size="L"
                            onClick={() =>
                              ended && topBid ? setModal('contact') : changeRole('buyer')
                            }
                          >
                            {ended && topBid
                              ? 'Связаться с участником'
                              : 'Посмотреть как покупатель'}
                            <Icon name="ActionArrowUpRight16" size={18} />
                          </Button>
                        </div>
                      )}
                      <section className={s.history} aria-label="История ставок">
                        <div className={s.sectionTitle}>
                          <h3>История ставок</h3>
                          <Badge>{auction.bids.length}</Badge>
                        </div>
                        {auction.bids.length ? (
                          <ol>
                            {auction.bids.map((bid, index) => (
                              <li key={bid.id}>
                                <span
                                  className={`${s.bidAvatar} ${bid.by === 'you' ? s.yourAvatar : ''}`}
                                >
                                  <Icon name="PlaceholderUser16" size={19} />
                                </span>
                                <div>
                                  <strong>
                                    {bid.by === 'you'
                                      ? role === 'buyer'
                                        ? 'Вы'
                                        : 'Покупатель из прототипа'
                                      : `Участник ${auction.bids.length - index}`}
                                  </strong>
                                  <span>
                                    {formatTime(bid.at)} МСК {index === 0 ? '· Лучшая ставка' : ''}
                                  </span>
                                </div>
                                <strong>{money(bid.amount)}</strong>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <div className={s.emptyHistory}>
                            <Icon name="PlaceholderUser16" size={24} />
                            <p>Первая ставка ещё впереди</p>
                            <span>Как только покупатель предложит цену, она появится здесь.</span>
                          </div>
                        )}
                      </section>
                      {role === 'buyer' && (
                        <section className={s.description}>
                          <h3>О квартире</h3>
                          <p>
                            Светлая квартира с просторной гостиной и отдельной спальней. Большие
                            окна, спокойные натуральные оттенки и всё для жизни в центре города.
                          </p>
                          <span>Собственник · Учебное объявление</span>
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <div className={s.homeIndicator} aria-hidden="true">
              <span />
            </div>
          </div>
          <p className={s.previewCaption}>
            <span /> Мобильное приложение ·{' '}
            {role === 'seller' ? 'Сценарий продавца' : 'Сценарий покупателя'}
          </p>
        </section>
      </main>
      <footer className={s.pageFooter}>
        <span>© Циан · Учебный проект</span>
        <span>Здесь можно пробовать. Все ставки — учебные.</span>
        <Link to="/reference/" reloadDocument>
          Исходный UI-kit <Icon name="ActionArrowUpRight16" size={13} />
        </Link>
      </footer>

      <Modal open={modal === 'rules'} title="Как работает аукцион" onClose={closeModal}>
        <div className={s.modalContent}>
          <p>
            Продавец задаёт стартовую цену, минимальный шаг и длительность. Аукцион начинается после
            публикации.
          </p>
          <ol>
            <li>Первая ставка — не ниже стартовой цены.</li>
            <li>Каждая следующая — выше текущей минимум на указанный шаг.</li>
            <li>В момент окончания фиксируется самое высокое предложение.</li>
          </ol>
          <div className={s.infoBox}>
            <Icon name="FunctionalInformationCircle16" size={20} />
            <p>
              Это учебная механика. Ставки не списывают деньги. Оплата и юридическое оформление в
              прототип не входят.
            </p>
          </div>
          <Button fullWidth onClick={closeModal}>
            Всё понятно
          </Button>
        </div>
      </Modal>
      <Modal
        open={modal === 'bid'}
        title={confirming ? 'Подтвердите ставку' : 'Ваша ставка'}
        onClose={closeModal}
      >
        <div className={s.modalContent}>
          <PropertySummary />
          {!confirming ? (
            <form className={s.bidForm} onSubmit={reviewBid} noValidate>
              <Input
                className={s.moneyField}
                autoFocus
                label="Сумма ставки, ₽"
                inputMode="numeric"
                value={amount}
                error={amountError || undefined}
                hint={`Минимум ${money(minimumBid(auction))} · шаг ${money(auction.terms.step)}`}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountError('');
                }}
              />
              <button
                type="button"
                className={s.suggestedAmount}
                disabled={ended}
                onClick={() => {
                  setAmount(String(minimumBid(auction)));
                  setAmountError('');
                }}
              >
                Указать {money(minimumBid(auction))}
              </button>
              {ended && (
                <p role="alert" className={s.errorText}>
                  Аукцион завершён. Новые ставки не принимаются.
                </p>
              )}
              <Button type="submit" fullWidth size="L" disabled={ended}>
                Продолжить
              </Button>
            </form>
          ) : (
            <>
              <div className={s.confirmAmount}>
                <span>Вы предлагаете</span>
                <strong>{money(parseMoney(amount))}</strong>
                <p>После принятия ставка появится в истории.</p>
              </div>
              <p className={s.muted}>Ставка участвует в аукционе. Оплата сейчас не требуется.</p>
              {submission === 'error' && (
                <div className={s.errorBox} role="alert">
                  <strong>Не удалось отправить ставку</strong>
                  <p>Соединение прервалось. Сумма сохранена — попробуйте ещё раз.</p>
                </div>
              )}
              {submission === 'pending' && (
                <p role="status" className={s.pendingText}>
                  Отправляем ставку… Дождитесь ответа.
                </p>
              )}
              <Button
                fullWidth
                size="L"
                loading={submission === 'pending'}
                disabled={ended}
                onClick={sendBid}
              >
                {submission === 'pending'
                  ? 'Отправляем ставку…'
                  : submission === 'error'
                    ? 'Повторить отправку'
                    : `Подтвердить ${money(parseMoney(amount))}`}
              </Button>
              <button
                className={s.reset}
                disabled={submission === 'pending'}
                onClick={() => {
                  setConfirming(false);
                  setSubmission('idle');
                }}
              >
                Изменить сумму
              </button>
              {ended && (
                <p role="alert" className={s.errorText}>
                  Аукцион завершён. Новые ставки не принимаются.
                </p>
              )}
            </>
          )}
        </div>
      </Modal>
      <Modal
        open={modal === 'contact'}
        title={role === 'seller' ? 'Участник аукциона' : 'Продавец квартиры'}
        onClose={closeModal}
      >
        <div className={s.modalContent}>
          <div className={s.contactAvatar}>
            <Icon name="PlaceholderUser16" size={32} />
          </div>
          <Text as="h3" variant="UIHeading2">
            {role === 'seller'
              ? topBid?.by === 'you'
                ? 'Покупатель из прототипа'
                : 'Участник аукциона'
              : 'Алексей · Собственник'}
          </Text>
          <p>
            Следующий шаг — договориться о просмотре и обсудить предложение{' '}
            {topBid && money(topBid.amount)}.
          </p>
          <div className={s.infoBox}>
            <Icon name="FunctionalInformationCircle16" size={20} />
            <p>В этом прототипе сообщения и звонки не отправляются. Сценарий аукциона пройден.</p>
          </div>
          <Button fullWidth onClick={closeModal}>
            Готово
          </Button>
        </div>
      </Modal>
    </div>
  );
}
