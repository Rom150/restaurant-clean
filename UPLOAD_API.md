# Upload API Documentation

## Overview

The Upload API allows authenticated users to upload and parse invoice/recipe files (PDF, images) and commit the parsed data to the database as mercuriale (product prices) or fiche technique ingredients.

## Endpoints

### POST /api/upload/parse

Parse an uploaded file and extract structured items.

**Authentication**: Required (JWT Bearer token)

**Content-Type**: `multipart/form-data`

**Request**:
- `file` (file): PDF, JPG, PNG, or XLSX file

**Response**:
```json
{
  "items": [
    {
      "name": "Tomatoes",
      "quantite": 10,
      "unite": "kg",
      "prix": 5.50,
      "confidence": 0.7
    }
  ],
  "meta": {
    "textPreview": "First 500 characters of extracted text..."
  }
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/upload/parse \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/invoice.pdf"
```

### POST /api/upload/commit

Commit parsed items to the database.

**Authentication**: Required (JWT Bearer token)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "items": [
    {
      "name": "Tomatoes",
      "quantite": 10,
      "unite": "kg",
      "prix": 5.50
    }
  ],
  "targetType": "mercuriale",
  "metadata": {
    "etablissementId": 1
  }
}
```

**Target Types**:
- `mercuriale`: Creates/updates products with prices
- `ficheTechnique`: Adds ingredients to an existing fiche technique

**Response** (mercuriale):
```json
{
  "targetType": "mercuriale",
  "created": [
    {
      "productId": 1,
      "prixId": 10,
      "name": "Tomatoes"
    }
  ],
  "count": 1
}
```

**Response** (ficheTechnique):
```json
{
  "targetType": "ficheTechnique",
  "ficheId": 5,
  "created": [
    {
      "ficheIngredientId": 20,
      "productId": 1,
      "name": "Tomatoes"
    }
  ],
  "count": 1
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/upload/commit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "Tomatoes", "quantite": 10, "unite": "kg", "prix": 5.50}],
    "targetType": "mercuriale",
    "metadata": {"etablissementId": 1}
  }'
```

## Environment Variables

Make sure the following environment variables are set:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation/validation
- `ACCESS_TOKEN_EXPIRES_IN` (optional): Token expiration time (default: 15m)

Example `.env` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_db"
JWT_SECRET="your-secret-key-change-me-in-production"
ACCESS_TOKEN_EXPIRES_IN="15m"
```

## Setup and Running

### Install Dependencies
```bash
npm install
```

### Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Seed sample data for upload testing
npm run seed:upload
```

### Start the Server
```bash
# Development mode with auto-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Testing

Run unit tests:
```bash
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Supported File Types

- **PDF**: Extracted using pdf-parse library
- **Images** (JPG, PNG): Basic fallback (OCR implementation can be added)
- **XLSX**: Basic fallback (Excel parsing can be added)

## Parsing Heuristics

The parser uses simple heuristics to extract structured data from text:

1. **Pattern matching**: Looks for lines matching patterns like:
   - `Product Name 10 kg 5.50`
   - `Tomatoes 2.5 kg 3.20`

2. **Fallback extraction**: If no pattern matches, extracts product names from text lines

3. **Confidence scoring**: Each extracted item has a confidence score:
   - 0.7: Items matching the full pattern
   - 0.4: Items with only names extracted

## Database Schema

The Upload API interacts with the following Prisma models:

- `Product`: Main product entity
- `Prix`: Price entries for products per establishment
- `FicheTechnique`: Recipe/technical sheets
- `FicheIngredient`: Ingredients in technical sheets
- `Establishment`: Restaurant/establishment entity

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success
- `400`: Bad request (invalid file type, missing parameters)
- `401`: Unauthorized (invalid/missing JWT token)
- `404`: Not found (e.g., ficheTechnique not found)
- `500`: Server error

## Security

- All endpoints are protected with JWT authentication
- File uploads are limited to specific MIME types
- Input validation on all DTOs
- SQL injection protection via Prisma ORM
