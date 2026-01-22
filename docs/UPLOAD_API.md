# Upload API Documentation

## Overview

The Upload API allows you to parse and import invoice/recipe files (PDF, JPG, PNG) to extract product information and commit it to the database. This is useful for importing mercuriale (price lists) or fiche technique (recipe) ingredients.

## Prerequisites

Before using the Upload API, ensure:
1. Database is running and `DATABASE_URL` is configured
2. JWT authentication is configured with `JWT_SECRET`
3. You have a valid JWT token (login first)

## Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_db"
JWT_SECRET="your-secret-key"
```

## API Endpoints

### 1. Parse File

**Endpoint:** `POST /api/upload/parse`

**Description:** Upload a file (PDF, JPG, PNG) and extract structured product data.

**Authentication:** Required (JWT Bearer token)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file`: The file to parse (PDF, JPG, or PNG)

**Response:**
```json
{
  "items": [
    {
      "name": "Tomato",
      "quantite": 100,
      "unite": "g",
      "prix": 2.50,
      "confidence": 0.9
    },
    {
      "name": "Onion",
      "quantite": 200,
      "unite": "g",
      "prix": 1.50,
      "confidence": 0.8
    }
  ],
  "meta": {
    "textPreview": "First 500 characters of extracted text..."
  }
}
```

**Example with curl:**
```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Parse a file
curl -X POST http://localhost:3000/api/upload/parse \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/invoice.pdf"
```

### 2. Commit Parsed Data

**Endpoint:** `POST /api/upload/commit`

**Description:** Commit parsed items to the database as products, prices, or recipe ingredients.

**Authentication:** Required (JWT Bearer token)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "items": [
    {
      "name": "Tomato",
      "quantite": 100,
      "unite": "g",
      "prix": 2.50
    }
  ],
  "targetType": "mercuriale",
  "metadata": {
    "etablissementId": 1
  }
}
```

**Target Types:**
- `mercuriale`: Import as products with prices (for price lists/invoices)
  - Creates/updates Product records
  - Creates Prix entries if `etablissementId` is provided
  - Requires `etablissementId` in metadata for price tracking

- `ficheTechnique`: Import as recipe ingredients
  - Creates/finds Product records for ingredients
  - Creates FicheIngredient entries
  - Requires `ficheTechniqueId` in metadata

**Response:**
```json
{
  "success": true,
  "createdIds": {
    "products": [1, 2, 3],
    "prix": [1, 2, 3],
    "ficheIngredients": []
  }
}
```

**Example with curl:**
```bash
# Commit as mercuriale (price list)
curl -X POST http://localhost:3000/api/upload/commit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Tomato", "quantite": 100, "unite": "g", "prix": 2.50},
      {"name": "Onion", "quantite": 200, "unite": "g", "prix": 1.50}
    ],
    "targetType": "mercuriale",
    "metadata": {
      "etablissementId": 1
    }
  }'

# Commit as fiche technique ingredients
curl -X POST http://localhost:3000/api/upload/commit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Flour", "quantite": 500, "unite": "g"},
      {"name": "Water", "quantite": 300, "unite": "ml"}
    ],
    "targetType": "ficheTechnique",
    "metadata": {
      "ficheTechniqueId": 1
    }
  }'
```

## Parsing Heuristics

The parser recognizes several text patterns:

1. **Pipe-separated format:** `Product | 100 | g | 2.50`
2. **Space-separated format:** `Product 100g 2.50` or `Product 100 g €2.50`
3. **Partial information:** `Product 100g` (without price) or `Product €2.50` (without quantity)
4. **Simple product names:** `Product Name` (minimal confidence)

The parser:
- Skips header lines (Product, Price, Quantity, etc.)
- Extracts quantities and units (g, kg, ml, L, unit, etc.)
- Identifies prices with or without currency symbols (€, $)
- Returns confidence scores (0.5 - 0.9) based on pattern match quality

## Supported File Formats

- **PDF:** Parsed using pdf-parse library (text extraction)
- **Images (JPG, PNG):** Parsed using Tesseract OCR
- **Maximum file size:** Depends on your server configuration (default: 10MB)

## Seeding Sample Data

To populate the database with sample products for testing:

```bash
npm run seed:upload
```

This creates 10 sample products with prices and units, plus prix entries if an establishment exists.

## Error Handling

**Common Errors:**

- `400 Bad Request - No file provided`: File field is missing in parse request
- `400 Bad Request - Unsupported file type`: File is not PDF, JPG, or PNG
- `400 Bad Request - Failed to parse PDF`: PDF parsing failed
- `400 Bad Request - Failed to perform OCR`: Image OCR failed
- `400 Bad Request - ficheTechniqueId required`: Missing required metadata for ficheTechnique
- `401 Unauthorized`: Missing or invalid JWT token

## Development Workflow

1. **Start the development server:**
```bash
npm run start:dev
```

2. **Run migrations (if needed):**
```bash
npx prisma migrate dev
```

3. **Seed sample data:**
```bash
npm run seed:upload
```

4. **Login to get JWT token:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

5. **Test file parsing:**
```bash
curl -X POST http://localhost:3000/api/upload/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-invoice.pdf"
```

6. **Commit parsed data:**
```bash
curl -X POST http://localhost:3000/api/upload/commit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[...],"targetType":"mercuriale","metadata":{"etablissementId":1}}'
```

## Testing

Run unit tests:
```bash
npm run test -- upload.service.spec
```

Run all tests:
```bash
npm run test
```

## Module Structure

```
src/upload/
├── upload.module.ts          # NestJS module definition
├── upload.controller.ts      # HTTP endpoints
├── upload.service.ts         # Business logic (parsing, committing)
└── dto/
    ├── parse-response.dto.ts # Parse response structure
    └── commit-upload.dto.ts  # Commit request structure

test/
└── upload.service.spec.ts    # Unit tests

scripts/
└── seed-upload-sample.js     # Sample data seeding
```

## Integration with Existing Modules

The Upload module integrates with:
- **PrismaModule:** Database operations for Product, Prix, FicheIngredient
- **AuthModule:** JWT authentication for protected endpoints
- **FichesTechniquesModule:** Can add ingredients to existing recipes
- **Prisma Models:** Product, Prix, FicheTechnique, FicheIngredient, Establishment

## Security Considerations

- All endpoints are protected with JWT authentication
- File uploads are limited by server configuration
- Only PDF and image formats are accepted
- Parsing is done server-side (no client-side execution)
- User context is available for audit trails

## Future Enhancements

Potential improvements:
- Support for XLSX/CSV files
- Configurable parsing patterns per establishment
- Batch upload support
- Progress tracking for large files
- Machine learning for improved accuracy
- Custom field mapping configuration
- Duplicate detection and merging
