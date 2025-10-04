# Icon Guide - Eternal Realms

Detta dokument listar alla emoji-ikoner som används i spelet för att visualisera olika koncept.

## Stats & Resources

| Icon | Betydelse | Användning |
|------|-----------|------------|
| ❤️ | Health | Hälsopoäng för spelare och fiender |
| 💧 | Mana | Manapoäng för magiska förmågor |
| ⭐ | Experience | Erfarenhetspoäng (XP) |
| ⚔️ | Attack | Attackstyrka |
| 🛡️ | Defense | Försvarsstyrka |
| 💰 | Gold | Valuta/guld |
| 💎 | Gems | Premium-valuta |

## Navigation & UI

| Icon | Betydelse | Användning |
|------|-----------|------------|
| 🗺️ | Adventure | Adventure-fliken |
| ⚔️ | Combat | Combat-fliken |
| 🎒 | Inventory | Inventory-fliken |

## Items & Loot

| Icon | Betydelse | Användning |
|------|-----------|------------|
| ⚔️ | Weapon | Vapen i inventory |
| 🛡️ | Armor | Rustning i inventory |
| 🧪 | Consumable | Förbrukningsvaror (potions, etc) |
| 💎 | Material | Crafting-material |
| ✨ | Loot Item | Droppade items från fiender |
| 🎁 | Rewards | Belöningar efter combat |
| 📦 | Items Looted | Loot-sektion |

## Enemies (Regular)

| Icon | Betydelse | Enemy ID |
|------|-----------|----------|
| 🟢 | Slime | `slime` |
| 👹 | Goblin Scout | `goblin_scout` |
| 🐺 | Wild Wolf | `wild_wolf` |
| 💀 | Skeleton Warrior | `skeleton_warrior` |
| 🐻 | Forest Bear | `forest_bear` |
| 👾 | Default Monster | Fallback för okända fiender |

## Enemies (Bosses)

| Icon | Betydelse | Enemy ID |
|------|-----------|----------|
| 👑 | Boss Crown | Visas på alla bossar |
| 👑 | Goblin King | `goblin_king` (boss) |
| 🐉 | Ancient Dragon | `ancient_dragon` (boss) |

## Combat & Results

| Icon | Betydelse | Användning |
|------|-----------|------------|
| 🎉 | Victory | Seger i combat |
| 💀 | Defeated | Förlust i combat |
| ⚠️ | Warning | Defeat penalty varning |

## Implementation Details

### Hur man lägger till nya ikoner

1. **För nya stats/resources:**
   - Välj en passande emoji
   - Lägg till i relevanta komponenter (Game.tsx, EnemyList.tsx, etc)
   - Uppdatera detta dokument

2. **För nya enemies:**
   - Uppdatera `getEnemyIcon()` funktionen i `EnemyList.tsx`
   - Lägg till mapping i `iconMap`
   - Uppdatera detta dokument

3. **För nya item-typer:**
   - Uppdatera icon-logiken i `Inventory.tsx`
   - Lägg till i switch-statement vid rendering

### Konsistensregler

- **Stats** använder alltid samma ikon överallt (❤️ = Health, etc)
- **Fiender** har unika ikoner baserat på ID
- **Bossar** har alltid 👑 ikonen PLUS en unik emoji
- **Combat-resultat** använder 🎉 för seger, 💀 för nederlag

### Komponenter med ikoner

| Komponent | Ikoner som används |
|-----------|-------------------|
| `Game.tsx` | ❤️💧⭐⚔️🛡️💰💎🗺️⚔️🎒 |
| `EnemyList.tsx` | 🟢👹🐺💀🐻👑🐉👾❤️⚔️🛡️⭐💰 |
| `Inventory.tsx` | 🎒⚔️🛡️🧪💎❤️💧⭐💰 |
| `VictoryModal.tsx` | 🎉💀🎁⭐💰📦✨⚠️ |
| `CombatLog.tsx` | ❤️⚔️🛡️ |

## Emoji Fallbacks

Alla emojis renderas nativt av användarens operativsystem. Om en emoji inte stöds visas ofta en grå box eller text-representation. De emojis vi använder är från Unicode 12.0+ och stöds av:

- ✅ macOS 10.15+
- ✅ iOS 13+
- ✅ Windows 10+
- ✅ Android 10+
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)

## Accessibility Notes

Emojis är dekorativa och har alltid text-labels bredvid sig. Till exempel:
- `❤️ Health` - Ikonen är visuell förstärkning, "Health" är den faktiska informationen
- `💰 Gold` - Samma princip

Detta säkerställer att skärmläsare kan läsa informationen korrekt även om emojis inte visas eller läses korrekt.

## Future Icons (Potential Additions)

Förslag på ikoner för framtida features:

| Icon | Förslag | Feature |
|------|---------|---------|
| 🏹 | Ranged Attack | Ranged weapons |
| 🪄 | Magic | Magic spells |
| 🔥 | Fire Damage | Elemental damage |
| ❄️ | Ice Damage | Elemental damage |
| ⚡ | Lightning | Elemental damage |
| 🩹 | Healing | Healing items/spells |
| 🎯 | Critical Hit | Combat log critical hits |
| 🏆 | Achievement | Achievement unlocks |
| 📜 | Quest | Quest items/objectives |
| 🗝️ | Key Item | Special quest items |
| 👥 | Party | Multiplayer/party system |
| 🏰 | Dungeon | Dungeon instances |
| 🛠️ | Crafting | Crafting system |
| 📖 | Spellbook | Magic system |
| 🎲 | Random Event | Random encounters |

---

**Last Updated:** 2025-10-02
**Maintained by:** Claude Code
