# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: social.spec.ts >> Social surfaces >> Clans: roster + chat input appends a message
- Location: tests\e2e\social.spec.ts:65:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Send$/i })
    - locator resolved to <button disabled type="submit" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-gradient-to-r from-primary via-violet to-pink text-white shadow-glow transition-all hover:-translate-y-0.…>…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    108 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - link "Gaming Platform" [ref=e7] [cursor=pointer]:
          - /url: /
          - img [ref=e10]
          - generic [ref=e12]:
            - text: Gaming
            - generic [ref=e13]: Platform
        - navigation [ref=e14]:
          - link "World" [ref=e15] [cursor=pointer]:
            - /url: /world
            - img [ref=e16]
          - link "Home" [ref=e20] [cursor=pointer]:
            - /url: /
            - img [ref=e21]
          - link "Casino" [ref=e25] [cursor=pointer]:
            - /url: /casino
            - img [ref=e26]
          - link "Crash" [ref=e29] [cursor=pointer]:
            - /url: /crash
            - img [ref=e30]
          - link "Dice" [ref=e34] [cursor=pointer]:
            - /url: /dice
            - img [ref=e35]
          - link "Roulette" [ref=e38] [cursor=pointer]:
            - /url: /roulette
            - img [ref=e39]
          - link "Games" [ref=e43] [cursor=pointer]:
            - /url: /games
            - img [ref=e44]
          - link "Sports" [ref=e47] [cursor=pointer]:
            - /url: /sportsbook
            - img [ref=e48]
          - link "Tournaments" [ref=e51] [cursor=pointer]:
            - /url: /tournaments
            - img [ref=e52]
          - link "Leaderboard" [ref=e59] [cursor=pointer]:
            - /url: /leaderboards
            - img [ref=e60]
          - link "Promotions" [ref=e67] [cursor=pointer]:
            - /url: /#promotions
            - img [ref=e68]
          - link "VIP" [ref=e71] [cursor=pointer]:
            - /url: /rewards
            - img [ref=e72]
        - generic [ref=e77]:
          - button "Search" [ref=e78] [cursor=pointer]:
            - img [ref=e79]
            - generic [ref=e82]: Search
            - generic [ref=e83]: ⌘K
          - button "Notifications" [ref=e84] [cursor=pointer]:
            - img [ref=e85]
          - link "Play now" [ref=e91] [cursor=pointer]:
            - /url: /register
          - generic [ref=e92]:
            - link "Sign in" [ref=e93] [cursor=pointer]:
              - /url: /login
            - link "Sign up" [ref=e94] [cursor=pointer]:
              - /url: /register
    - main [ref=e95]:
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]:
              - generic [ref=e101]: NEON
              - img [ref=e103]
            - generic [ref=e105]:
              - generic [ref=e106]:
                - img [ref=e107]
                - text: Your Clan
              - heading "Neon Syndicate" [level=1] [ref=e112]
              - paragraph [ref=e113]:
                - generic [ref=e114]:
                  - img [ref=e115]
                  - text: "Leader:"
                  - generic [ref=e117]: NovaStrike
                - generic [ref=e118]:
                  - img [ref=e119]
                  - generic [ref=e124]: "16"
                  - text: members ·
                  - generic [ref=e125]: "13"
                  - text: online
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - img [ref=e129]
                  - text: Clan Level 58
                - generic [ref=e131]: 742,000 / 1,000,000 XP
          - generic [ref=e134]:
            - generic [ref=e135]:
              - img [ref=e137]
              - generic [ref=e143]:
                - paragraph [ref=e144]: Clan Rank
                - paragraph [ref=e145]:
                  - generic [ref=e146]: "#14"
            - generic [ref=e147]:
              - img [ref=e149]
              - generic [ref=e158]:
                - paragraph [ref=e159]: Wars Won
                - paragraph [ref=e160]: "37"
            - generic [ref=e161]:
              - img [ref=e163]
              - generic [ref=e165]:
                - paragraph [ref=e166]: Weekly Wins
                - paragraph [ref=e167]: 1,299
        - generic [ref=e168]:
          - heading "Members" [level=2] [ref=e170]:
            - img [ref=e171]
            - text: Members
          - generic [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e179]: "NO"
              - generic [ref=e181]:
                - paragraph [ref=e182]:
                  - generic [ref=e183]: 🇫🇷
                  - text: NovaStrike
                - paragraph [ref=e184]: Level 85 · 27,523 pts
              - generic [ref=e185]:
                - img [ref=e186]
                - text: Leader
            - generic [ref=e188]:
              - generic [ref=e190]: CR
              - generic [ref=e192]:
                - paragraph [ref=e193]:
                  - generic [ref=e194]: 🇺🇸
                  - text: CryptoFox
                - paragraph [ref=e195]: Level 76 · 45,208 pts
              - generic [ref=e196]:
                - img [ref=e197]
                - text: Officer
            - generic [ref=e203]:
              - generic [ref=e205]: LU
              - generic [ref=e207]:
                - paragraph [ref=e208]:
                  - generic [ref=e209]: 🇺🇸
                  - text: LunaBet
                - paragraph [ref=e210]: Level 40 · 18,868 pts
              - generic [ref=e211]:
                - img [ref=e212]
                - text: Officer
            - generic [ref=e218]:
              - generic [ref=e220]: PI
              - generic [ref=e222]:
                - paragraph [ref=e223]:
                  - generic [ref=e224]: 🇨🇦
                  - text: PixelKing
                - paragraph [ref=e225]: Level 81 · 24,909 pts
              - generic [ref=e226]:
                - img [ref=e227]
                - text: Officer
            - generic [ref=e233]:
              - generic [ref=e235]: ZE
              - generic [ref=e237]:
                - paragraph [ref=e238]:
                  - generic [ref=e239]: 🇫🇷
                  - text: Zenith
                - paragraph [ref=e240]: Level 49 · 43,231 pts
              - generic [ref=e241]:
                - img [ref=e242]
                - text: Member
            - generic [ref=e247]:
              - generic [ref=e249]: VO
              - generic [ref=e251]:
                - paragraph [ref=e252]:
                  - generic [ref=e253]: 🇺🇸
                  - text: Vortex
                - paragraph [ref=e254]: Level 58 · 37,432 pts
              - generic [ref=e255]:
                - img [ref=e256]
                - text: Member
            - generic [ref=e261]:
              - generic [ref=e263]: AP
              - generic [ref=e265]:
                - paragraph [ref=e266]:
                  - generic [ref=e267]: 🇮🇳
                  - text: ApexWolf
                - paragraph [ref=e268]: Level 85 · 1,525 pts
              - generic [ref=e269]:
                - img [ref=e270]
                - text: Member
            - generic [ref=e275]:
              - generic [ref=e277]: MI
              - generic [ref=e279]:
                - paragraph [ref=e280]:
                  - generic [ref=e281]: 🇳🇬
                  - text: MirageX
                - paragraph [ref=e282]: Level 89 · 24,539 pts
              - generic [ref=e283]:
                - img [ref=e284]
                - text: Member
            - generic [ref=e289]:
              - generic [ref=e291]: GO
              - generic [ref=e293]:
                - paragraph [ref=e294]:
                  - generic [ref=e295]: 🇫🇷
                  - text: GoldRush
                - paragraph [ref=e296]: Level 61 · 33,607 pts
              - generic [ref=e297]:
                - img [ref=e298]
                - text: Member
            - generic [ref=e303]:
              - generic [ref=e305]: PH
              - generic [ref=e307]:
                - paragraph [ref=e308]:
                  - generic [ref=e309]: 🇳🇬
                  - text: Phoenix
                - paragraph [ref=e310]: Level 23 · 40,055 pts
              - generic [ref=e311]:
                - img [ref=e312]
                - text: Member
            - generic [ref=e317]:
              - generic [ref=e319]: RI
              - generic [ref=e321]:
                - paragraph [ref=e322]:
                  - generic [ref=e323]: 🇨🇦
                  - text: Riptide
                - paragraph [ref=e324]: Level 57 · 44,745 pts
              - generic [ref=e325]:
                - img [ref=e326]
                - text: Member
            - generic [ref=e331]:
              - generic [ref=e333]: "ON"
              - generic [ref=e335]:
                - paragraph [ref=e336]:
                  - generic [ref=e337]: 🇫🇷
                  - text: Onyx
                - paragraph [ref=e338]: Level 31 · 1,471 pts
              - generic [ref=e339]:
                - img [ref=e340]
                - text: Member
            - generic [ref=e345]:
              - generic [ref=e347]: CO
              - generic [ref=e349]:
                - paragraph [ref=e350]:
                  - generic [ref=e351]: 🇨🇦
                  - text: Cobalt
                - paragraph [ref=e352]: Level 63 · 23,625 pts
              - generic [ref=e353]:
                - img [ref=e354]
                - text: Member
            - generic [ref=e359]:
              - generic [ref=e361]: SP
              - generic [ref=e363]:
                - paragraph [ref=e364]:
                  - generic [ref=e365]: 🇯🇵
                  - text: Specter
                - paragraph [ref=e366]: Level 17 · 31,589 pts
              - generic [ref=e367]:
                - img [ref=e368]
                - text: Member
            - generic [ref=e373]:
              - generic [ref=e375]: "NO"
              - generic [ref=e377]:
                - paragraph [ref=e378]:
                  - generic [ref=e379]: 🇺🇸
                  - text: NovaStrike
                - paragraph [ref=e380]: Level 76 · 26,764 pts
              - generic [ref=e381]:
                - img [ref=e382]
                - text: Member
            - generic [ref=e387]:
              - generic [ref=e389]: CR
              - generic [ref=e391]:
                - paragraph [ref=e392]:
                  - generic [ref=e393]: 🇮🇳
                  - text: CryptoFox
                - paragraph [ref=e394]: Level 85 · 10,441 pts
              - generic [ref=e395]:
                - img [ref=e396]
                - text: Member
        - generic [ref=e401]:
          - heading "Clan Missions" [level=2] [ref=e403]:
            - img [ref=e404]
            - text: Clan Missions
          - generic [ref=e408]:
            - generic [ref=e409]:
              - generic [ref=e410]:
                - img [ref=e412]
                - generic [ref=e417]:
                  - paragraph [ref=e418]: Win 500 Crash rounds
                  - paragraph [ref=e419]:
                    - img [ref=e420]
                    - text: 5,000 Clan XP
              - generic [ref=e424]:
                - generic [ref=e425]: 372 / 500
                - generic [ref=e426]: 74%
            - generic [ref=e428]:
              - generic [ref=e429]:
                - img [ref=e431]
                - generic [ref=e434]:
                  - paragraph [ref=e435]: Wager 2M coins together
                  - paragraph [ref=e436]:
                    - img [ref=e437]
                    - text: Legendary Frame
              - generic [ref=e441]:
                - generic [ref=e442]: 1,640,000 / 2,000,000
                - generic [ref=e443]: 82%
            - generic [ref=e445]:
              - generic [ref=e446]:
                - img [ref=e448]
                - generic [ref=e454]:
                  - paragraph [ref=e455]: Reach Top 10 leaderboard
                  - paragraph [ref=e456]:
                    - img [ref=e457]
                    - text: Clan Banner
                - generic [ref=e460]: Complete
              - generic [ref=e462]:
                - generic [ref=e463]: 14 / 10
                - generic [ref=e464]: 100%
            - generic [ref=e466]:
              - generic [ref=e467]:
                - img [ref=e469]
                - generic [ref=e473]:
                  - paragraph [ref=e474]: Play 1,000 games this week
                  - paragraph [ref=e475]:
                    - img [ref=e476]
                    - text: 10,000 Coins
              - generic [ref=e480]:
                - generic [ref=e481]: 812 / 1,000
                - generic [ref=e482]: 81%
        - generic [ref=e484]:
          - generic [ref=e485]:
            - heading "Clan Achievements" [level=2] [ref=e487]:
              - img [ref=e488]
              - text: Clan Achievements
            - generic [ref=e491]:
              - generic [ref=e492]:
                - img [ref=e494]
                - generic [ref=e500]:
                  - generic [ref=e501]:
                    - heading "Tournament Titans" [level=3] [ref=e502]
                    - generic [ref=e503]: Legendary
                  - paragraph [ref=e504]: Won a clan tournament
              - generic [ref=e505]:
                - img [ref=e507]
                - generic [ref=e512]:
                  - generic [ref=e513]:
                    - heading "Crash Dynasty" [level=3] [ref=e514]
                    - generic [ref=e515]: Epic
                  - paragraph [ref=e516]: 10,000 crash wins as a clan
              - generic [ref=e517]:
                - img [ref=e519]
                - generic [ref=e521]:
                  - generic [ref=e522]:
                    - heading "Unbroken" [level=3] [ref=e523]
                    - generic [ref=e524]: Rare
                  - paragraph [ref=e525]: 30-day activity streak
              - generic [ref=e526]:
                - img [ref=e528]
                - generic [ref=e537]:
                  - generic [ref=e538]:
                    - heading "War Machine" [level=3] [ref=e539]
                    - generic [ref=e540]: Epic
                  - paragraph [ref=e541]: Won 5 clan wars
          - generic [ref=e542]:
            - heading "Clan Events" [level=2] [ref=e544]:
              - img [ref=e545]
              - text: Clan Events
            - generic [ref=e547]:
              - generic [ref=e548]:
                - img [ref=e550]
                - generic [ref=e559]:
                  - 'heading "Clan War: Void Reapers" [level=3] [ref=e560]'
                  - paragraph [ref=e561]: Head-to-head crash battle
                  - paragraph [ref=e562]:
                    - generic [ref=e563]:
                      - img [ref=e564]
                      - text: 50,000 Clan XP
                - generic [ref=e570]:
                  - paragraph [ref=e571]: Starts in
                  - generic [ref=e572]: 03:11:03
              - generic [ref=e573]:
                - img [ref=e575]
                - generic [ref=e577]:
                  - heading "Weekend Raid" [level=3] [ref=e578]
                  - paragraph [ref=e579]: Co-op wagering challenge
                  - paragraph [ref=e580]:
                    - generic [ref=e581]:
                      - img [ref=e582]
                      - text: Legendary Loot
                - generic [ref=e588]:
                  - paragraph [ref=e589]: Starts in
                  - generic [ref=e590]: 25:59:03
              - generic [ref=e591]:
                - img [ref=e593]
                - generic [ref=e595]:
                  - heading "Season Finale" [level=3] [ref=e596]
                  - paragraph [ref=e597]: Final push for Diamond
                  - paragraph [ref=e598]:
                    - generic [ref=e599]:
                      - img [ref=e600]
                      - text: Diamond Emblem
                - generic [ref=e606]:
                  - paragraph [ref=e607]: Starts in
                  - generic [ref=e608]: 71:59:03
        - generic [ref=e609]:
          - heading "Clan Chat" [level=2] [ref=e611]:
            - img [ref=e612]
            - text: Clan Chat
          - generic [ref=e614]:
            - generic [ref=e615]:
              - generic [ref=e616]:
                - img [ref=e617]
                - text: Neon Syndicate Lounge
              - generic [ref=e619]: 13 online · prototype
            - generic [ref=e621]:
              - generic [ref=e622]:
                - generic [ref=e623]: "NO"
                - generic [ref=e624]:
                  - paragraph [ref=e625]:
                    - text: NovaStrike
                    - generic [ref=e626]: · 42m ago
                  - generic [ref=e627]: GG on that clan war win last night 🔥
              - generic [ref=e628]:
                - generic [ref=e629]: CR
                - generic [ref=e630]:
                  - paragraph [ref=e631]:
                    - text: CryptoFox
                    - generic [ref=e632]: · 31m ago
                  - generic [ref=e633]: Who's up for the Weekend Raid? Need 3 more.
              - generic [ref=e634]:
                - generic [ref=e635]: LU
                - generic [ref=e636]:
                  - paragraph [ref=e637]:
                    - text: LunaBet
                    - generic [ref=e638]: · 18m ago
                  - generic [ref=e639]: Just hit a 24× on crash, contribution incoming 💸
              - generic [ref=e640]:
                - generic [ref=e641]: ZE
                - generic [ref=e642]:
                  - paragraph [ref=e643]:
                    - text: Zenith
                    - generic [ref=e644]: · 9m ago
                  - generic [ref=e645]: Officers — mission board updated, check missions tab.
              - generic [ref=e646]:
                - generic [ref=e647]: AP
                - generic [ref=e648]:
                  - paragraph [ref=e649]:
                    - text: ApexWolf
                    - generic [ref=e650]: · 3m ago
                  - generic [ref=e651]: lets push for Diamond this season, we got this 💪
            - generic [ref=e652]:
              - textbox "Message your clan…" [ref=e653]
              - button "Send" [disabled]:
                - img
                - text: Send
        - generic [ref=e654]:
          - heading "Browse Clans" [level=2] [ref=e656]:
            - img [ref=e657]
            - text: Browse Clans
          - generic [ref=e666]:
            - generic [ref=e667]:
              - generic [ref=e670]: VOID
              - paragraph [ref=e671]: Void Reapers
              - paragraph [ref=e672]: Level 62 · 48 members
              - paragraph [ref=e673]:
                - img [ref=e674]
                - text: 984,000 power
              - button "Join Clan" [ref=e676] [cursor=pointer]
            - generic [ref=e677]:
              - generic [ref=e680]: GOLD
              - paragraph [ref=e681]: Golden Aces
              - paragraph [ref=e682]: Level 55 · 41 members
              - paragraph [ref=e683]:
                - img [ref=e684]
                - text: 872,000 power
              - button "Join Clan" [ref=e686] [cursor=pointer]
            - generic [ref=e687]:
              - generic [ref=e690]: CRSH
              - paragraph [ref=e691]: Crash Cartel
              - paragraph [ref=e692]: Level 51 · 39 members
              - paragraph [ref=e693]:
                - img [ref=e694]
                - text: 810,000 power
              - button "Join Clan" [ref=e696] [cursor=pointer]
            - generic [ref=e697]:
              - generic [ref=e700]: VIPR
              - paragraph [ref=e701]: Neon Vipers
              - paragraph [ref=e702]: Level 58 · 44 members
              - paragraph [ref=e703]:
                - img [ref=e704]
                - text: 921,000 power
              - button "Join Clan" [ref=e706] [cursor=pointer]
            - generic [ref=e707]:
              - generic [ref=e710]: LUCK
              - paragraph [ref=e711]: Lucky Legion
              - paragraph [ref=e712]: Level 47 · 36 members
              - paragraph [ref=e713]:
                - img [ref=e714]
                - text: 703,000 power
              - button "Join Clan" [ref=e716] [cursor=pointer]
            - generic [ref=e717]:
              - generic [ref=e720]: PHNT
              - paragraph [ref=e721]: Phantom Elite
              - paragraph [ref=e722]: Level 66 · 50 members
              - paragraph [ref=e723]:
                - img [ref=e724]
                - text: 1,040,000 power
              - button "Join Clan" [ref=e726] [cursor=pointer]
  - button "Sound settings" [ref=e728] [cursor=pointer]:
    - img [ref=e729]
  - button "Accessibility options" [ref=e734] [cursor=pointer]:
    - img [ref=e735]
  - button "AI assistant" [ref=e742] [cursor=pointer]:
    - img [ref=e743]
    - generic [ref=e746]: "6"
  - region "Notifications alt+T"
  - generic [ref=e748]:
    - img [ref=e750]
    - button "Open Tanstack query devtools" [ref=e798] [cursor=pointer]:
      - img [ref=e799]
  - generic [ref=e851] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e852]:
      - img [ref=e853]
    - generic [ref=e856]:
      - button "Open issues overlay" [ref=e857]:
        - generic [ref=e858]:
          - generic [ref=e859]: "0"
          - generic [ref=e860]: "1"
        - generic [ref=e861]: Issue
      - button "Collapse issues badge" [ref=e862]:
        - img [ref=e863]
  - alert [ref=e865]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | import { demoLogin, prep, VISIBLE_TIMEOUT } from './helpers';
  4  | 
  5  | test.describe('Social surfaces', () => {
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await prep(page);
  8  |     await demoLogin(page);
  9  |   });
  10 | 
  11 |   test('Friends: online/offline sections and friend rows render', async ({ page }) => {
  12 |     await page.goto('/friends');
  13 |     await page.waitForLoadState('domcontentloaded');
  14 | 
  15 |     await expect(page.getByRole('heading', { name: /^Friends$/i }).first()).toBeVisible({
  16 |       timeout: VISIBLE_TIMEOUT,
  17 |     });
  18 | 
  19 |     // Online/Offline section headings ("Online — N", "Offline — N").
  20 |     await expect(page.getByRole('heading', { name: /Online/i }).first()).toBeVisible({
  21 |       timeout: VISIBLE_TIMEOUT,
  22 |     });
  23 |     await expect(page.getByRole('heading', { name: /Offline/i }).first()).toBeVisible({
  24 |       timeout: VISIBLE_TIMEOUT,
  25 |     });
  26 | 
  27 |     // Friend rows expose Invite / Spectate actions.
  28 |     const rowAction = page
  29 |       .getByRole('button', { name: /Invite/i })
  30 |       .or(page.getByRole('button', { name: /Spectate/i }));
  31 |     await expect(rowAction.first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  32 |   });
  33 | 
  34 |   test('Leaderboards: podium + ranked list render', async ({ page }) => {
  35 |     await page.goto('/leaderboards');
  36 |     await page.waitForLoadState('domcontentloaded');
  37 | 
  38 |     await expect(page.getByRole('heading', { name: /Leaderboards/i }).first()).toBeVisible({
  39 |       timeout: VISIBLE_TIMEOUT,
  40 |     });
  41 | 
  42 |     // The full ranking section proves ranked data mounted.
  43 |     await expect(page.getByText(/Full ranking/i).first()).toBeVisible({
  44 |       timeout: VISIBLE_TIMEOUT,
  45 |     });
  46 |   });
  47 | 
  48 |   test('Community: sections render', async ({ page }) => {
  49 |     await page.goto('/community');
  50 |     await page.waitForLoadState('domcontentloaded');
  51 | 
  52 |     await expect(page.getByRole('heading', { name: /^Community$/i }).first()).toBeVisible({
  53 |       timeout: VISIBLE_TIMEOUT,
  54 |     });
  55 | 
  56 |     // A couple of the live sections.
  57 |     await expect(page.getByRole('heading', { name: /Top Players/i }).first()).toBeVisible({
  58 |       timeout: VISIBLE_TIMEOUT,
  59 |     });
  60 |     await expect(
  61 |       page.getByRole('heading', { name: /Live & Upcoming Events|Trending Games/i }).first(),
  62 |     ).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  63 |   });
  64 | 
  65 |   test('Clans: roster + chat input appends a message', async ({ page }) => {
  66 |     await page.goto('/clans');
  67 |     await page.waitForLoadState('domcontentloaded');
  68 | 
  69 |     // Roster section.
  70 |     await expect(page.getByRole('heading', { name: /Members/i }).first()).toBeVisible({
  71 |       timeout: VISIBLE_TIMEOUT,
  72 |     });
  73 | 
  74 |     // Chat input + submit. Type a unique message and assert it appears.
  75 |     const chat = page.getByPlaceholder(/Message your clan/i);
  76 |     await expect(chat).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  77 | 
  78 |     const msg = `e2e-hello-${Date.now()}`;
  79 |     await chat.fill(msg);
> 80 |     await page.getByRole('button', { name: /^Send$/i }).click();
     |                                                         ^ Error: locator.click: Test timeout of 60000ms exceeded.
  81 | 
  82 |     await expect(page.getByText(msg).first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  83 |   });
  84 | });
  85 | 
```