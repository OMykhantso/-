# UI Redesign & Ukrainian Localization — Shared Spec

Applies to both `web/` and `mobile/`. Goal: modern-minimalist visual style
("premium, generic — not tied to a specific brand") and **100% Ukrainian**
user-facing text. No backend changes, no API/contract changes, no behavior
changes — this is visuals + copy only.

## Design tokens

```
Primary (brand):     #2563EB  (blue)      hover/active: #1D4ED8
Accent (success):    #10B981  (emerald)   — DELIVERED, positive states
Warning:             #F59E0B  (amber)     — IN_TRANSIT, pending
Danger:              #EF4444  (red)       — FAILED, cancel, reject

Background (app):    #F8FAFC  (very light slate)
Surface (cards):     #FFFFFF
Border:              #E2E8F0
Text (primary):      #0F172A
Text (muted):        #64748B

Radius:  cards/panels 16px, buttons/inputs 10px, pills/badges 999px
Shadow:  soft — 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)
Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
Motion: 150–200ms ease-out transitions on hover/press/focus
```

- **Web**: load "Inter" from Google Fonts (`fonts.googleapis.com`) for a
  crisper, more premium type feel than the system stack. Fall back to
  `system-ui` if it fails to load.
- **Mobile**: keep the platform system font (San Francisco / Roboto) — no
  new native font dependency. Focus the "premium" feel on spacing, radius,
  color, and micro-interactions (press states, subtle shadows) instead.
- Status colors: CREATED/ASSIGNED = primary blue, PICKED_UP/IN_TRANSIT =
  amber, DELIVERED = emerald, FAILED/CANCELLED = red. Keep this mapping
  consistent across both apps.

## Ukrainian glossary (use these consistently — do not improvise variants)

| English (current)              | Ukrainian                          |
|---------------------------------|-------------------------------------|
| Delivery / Deliveries           | Доставка / Доставки                 |
| Client                          | Клієнт                              |
| Courier                         | Кур'єр                              |
| Dispatcher                      | Диспетчер                           |
| Pickup (address)                | Звідки (адреса відправлення)        |
| Dropoff (address)               | Куди (адреса призначення)           |
| Status                          | Статус                              |
| CREATED                         | Нове                                |
| ASSIGNED                        | Призначено                          |
| PICKED_UP                       | Забрано                             |
| IN_TRANSIT                      | В дорозі                            |
| DELIVERED                       | Доставлено                          |
| FAILED                          | Не вдалося                          |
| CANCELLED                       | Скасовано                           |
| Assign / Assign a courier       | Призначити / Призначити кур'єра     |
| Accept                          | Прийняти                            |
| Reject                          | Відхилити                           |
| Cancel / Cancel delivery        | Скасувати / Скасувати доставку      |
| ETA / Estimated arrival         | Орієнтовний час прибуття            |
| Route / Routes                  | Маршрут / Маршрути                  |
| Proof of delivery               | Підтвердження доставки              |
| Login / Log in                  | Увійти                              |
| Register / Sign up              | Реєстрація                          |
| Log out                         | Вийти                               |
| Email                           | Електронна пошта                    |
| Password                        | Пароль                              |
| My deliveries                   | Мої доставки                        |
| New delivery / Request delivery | Нова доставка / Замовити доставку   |
| Dispatcher control center       | Панель диспетчера                   |
| Live map                        | Карта в реальному часі              |
| Stats                           | Статистика                          |
| Total deliveries                | Усього доставок                     |
| Created today                   | Створено сьогодні                   |
| Avg delivery time               | Середній час доставки               |
| Active couriers                 | Активні кур'єри                     |
| Courier leaderboard             | Рейтинг кур'єрів                    |
| Weight (kg)                     | Вага (кг)                           |
| Package size                    | Розмір посилки                      |
| Description                     | Опис                                |
| Status history                  | Історія статусів                    |
| All deliveries / Back           | Усі доставки / Назад                |
| Home (mobile tab)                | Головна                             |
| Mark Picked Up                  | Позначити забраним                  |
| Start Transit                   | Почати доставку                     |
| Deliver                         | Доставити                           |
| Report Failed                   | Повідомити про невдачу              |
| Take Photo / Choose Photo       | Зробити фото / Обрати фото          |
| Signature                       | Підпис                              |
| Submit Proof of Delivery        | Підтвердити доставку                |
| Note (optional)                 | Примітка (необов'язково)            |
| Save / Cancel (generic buttons) | Зберегти / Скасувати                |
| Saved / New (address toggle)    | Збережена / Нова                    |
| Client / Courier / Dispatcher (role labels) | Клієнт / Кур'єр / Диспетчер |

Package sizes, if shown as an enum (S/M/L etc.), keep the letters but label
the field "Розмір посилки". Dates/times: keep using the browser/OS locale
formatting already in place (no need to hand-roll Ukrainian date formatting)
unless it's trivial via existing `Intl` usage — do not add a new i18n
library dependency for this.

## Scope boundaries

- Do NOT change: API endpoints, request/response shapes, Socket.IO event
  names/payloads, the delivery state machine, routing logic, business logic.
- DO change: every user-facing string (buttons, labels, headings, empty
  states, error messages, alerts/toasts, placeholder text) to Ukrainian,
  and the visual styling (colors, spacing, radius, shadows, typography) per
  the tokens above.
- Error messages surfaced from the backend (raw API error strings) should
  still be shown, but wrap them with Ukrainian framing where reasonable
  (e.g. "Помилка: {message}") rather than leaving a bare English sentence
  where avoidable — backend error strings themselves are out of scope to
  translate (that would require backend changes, which are out of scope).
