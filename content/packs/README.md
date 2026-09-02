# Learning content packs

Each JSON file is one lesson inside a **category**.

## Categories

| `category` | Label |
|------------|--------|
| `language` | שפה |
| `math` | חשבון |
| `english` | אנגלית |
| `science` | מדעים |
| `general` | כללי |

Set optional `"grade": 4` (כיתה) for parent filtering.

## Parent assignment

Parents browse the catalog in the app (**לימוד** tab) with search and grade/category filters, then assign packs to kids.

Kids only see packs assigned to them.

## Example

```json
{
  "id": "math-multiply-12",
  "version": 1,
  "title": { "he": "כפל ב-12", "en": "Multiply by 12" },
  "category": "math",
  "defaultPoints": 5,
  "activities": [ … ]
}
```

- **`title`** — name inside the category (e.g. "Multiply by 12", "The Tale of the Fox")
- **`category`** — one of the five values above

Legacy values `hebrew` → `language`, `stories` → `english`.

Restart the server after adding files.
