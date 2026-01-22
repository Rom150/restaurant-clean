# Pull Request: Upload & Parsing API Implementation

## 🎯 Overview

This PR adds a comprehensive Upload API module to the NestJS backend, enabling the parsing and importing of invoice/recipe files (PDF, JPG, PNG) into the database. This feature supports importing both **mercuriale** (price lists) and **fiche technique** (recipe) ingredients.

## 📋 Changes Summary

### New Features

#### 1. Upload Module (`src/upload/`)
Complete NestJS module with:
- **Controller**: JWT-protected HTTP endpoints
- **Service**: Business logic for parsing and database operations
- **DTOs**: Type-safe data structures
- **Unit Tests**: 10 passing tests with comprehensive coverage

#### 2. Two REST Endpoints

**POST /api/upload/parse**
- Accepts: `multipart/form-data` with file field (PDF, JPG, PNG)
- Auth: JWT Bearer token required
- Returns: Parsed items with confidence scores + text preview
- Features:
  - PDF text extraction using `pdf-parse`
  - OCR for images using `tesseract.js`
  - Multi-pattern text parsing with heuristics
  - Confidence scoring (0.5-0.9)

**POST /api/upload/commit**
- Accepts: JSON body with parsed items and metadata
- Auth: JWT Bearer token required
- Returns: Success status + created database IDs
- Features:
  - **Mercuriale mode**: Creates/updates Products and Prix entries
  - **FicheTechnique mode**: Creates FicheIngredient entries for recipes
  - Establishment-specific pricing support

### Parsing Capabilities

The parser recognizes multiple text formats:
```
# Pipe-separated format
Product | 100 | g | 2.50

# Space-separated format
Product 100g 2.50
Product 100 g €2.50

# Partial information
Product 100g          (no price)
Product €2.50         (no quantity)
Product Name          (just name)
```

Features:
- Automatic header detection and skipping
- Flexible unit extraction (g, kg, ml, L, unit, etc.)
- Currency symbol handling (€, $)
- Confidence scoring based on pattern quality

### Database Integration

**Mercuriale Mode (Price Lists):**
- Finds or creates Product records
- Updates prices if product exists
- Creates Prix entries with establishment association
- Tracks price validity dates

**FicheTechnique Mode (Recipes):**
- Finds or creates Product records (ingredients)
- Creates FicheIngredient entries
- Links ingredients to existing recipes
- Maintains ingredient order

### Files Added/Modified

**New Files:**
- `src/upload/upload.module.ts` - Module definition
- `src/upload/upload.controller.ts` - HTTP endpoints
- `src/upload/upload.service.ts` - Business logic
- `src/upload/dto/parse-response.dto.ts` - Response structure
- `src/upload/dto/commit-upload.dto.ts` - Request structure
- `src/upload/upload.service.spec.ts` - Unit tests (10 tests)
- `scripts/seed-upload-sample.js` - Sample data seeding
- `docs/UPLOAD_API.md` - Comprehensive API documentation

**Modified Files:**
- `src/app.module.ts` - Added UploadModule import
- `package.json` - Added dependencies and seed script
- `README.md` - Added module overview and env vars
- `package-lock.json` - Dependency lock file

### Dependencies Added

```json
{
  "devDependencies": {
    "pdf-parse": "^1.1.1",
    "tesseract.js": "^5.1.1",
    "@types/multer": "^1.4.12"
  }
}
```

## 🧪 Testing

All tests passing:
```
✓ 10 unit tests for UploadService
✓ Build successful
✓ Linter passing (0 errors)
✓ CodeQL security scan: 0 vulnerabilities
```

Test coverage includes:
- File validation and error handling
- PDF parsing logic
- Text extraction with multiple patterns
- Database persistence (mercuriale mode)
- Database persistence (ficheTechnique mode)
- Error scenarios and edge cases

## 🔒 Security

- All endpoints protected with JWT authentication (`@UseGuards(AuthGuard('jwt'))`)
- File type validation (PDF, JPG, PNG only)
- Server-side parsing (no client-side execution)
- Uses existing authentication patterns from AuthModule
- CodeQL scan: **0 vulnerabilities found**

## 📖 Documentation

Comprehensive documentation added:
- **API Documentation** (`docs/UPLOAD_API.md`):
  - Endpoint descriptions with examples
  - Request/response formats
  - curl command examples
  - Error handling guide
  - Development workflow
  - Integration patterns

- **README Updates**:
  - Module overview
  - Environment variables
  - Seed scripts
  - Testing instructions

## 🚀 Usage Examples

### 1. Parse a file
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# Parse PDF
curl -X POST http://localhost:3000/api/upload/parse \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@invoice.pdf"
```

### 2. Commit parsed data (mercuriale)
```bash
curl -X POST http://localhost:3000/api/upload/commit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Tomato", "quantite": 100, "unite": "g", "prix": 2.50}
    ],
    "targetType": "mercuriale",
    "metadata": {"etablissementId": 1}
  }'
```

### 3. Commit to recipe (ficheTechnique)
```bash
curl -X POST http://localhost:3000/api/upload/commit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"name": "Flour", "quantite": 500, "unite": "g"}
    ],
    "targetType": "ficheTechnique",
    "metadata": {"ficheTechniqueId": 1}
  }'
```

## 🗄️ Database Setup

No schema changes required - uses existing models:
- `Product` - Stores product information
- `Prix` - Stores establishment-specific prices
- `FicheTechnique` - Recipe definitions
- `FicheIngredient` - Recipe ingredient items
- `Establishment` - Organization/location data

### Seed Sample Data

```bash
npm run seed:upload
```

Creates 10 sample products with prices and units for testing.

## 🔄 Integration Points

The Upload module integrates seamlessly with existing modules:
- **PrismaModule**: Database operations
- **AuthModule**: JWT authentication
- **FichesTechniquesModule**: Recipe management
- **Existing Models**: Product, Prix, FicheIngredient, Establishment

## 📝 Development Checklist

- [x] Implement UploadModule with controller and service
- [x] Add JWT authentication to all endpoints
- [x] Implement PDF parsing with pdf-parse
- [x] Implement image OCR with tesseract.js
- [x] Create heuristic text extraction logic
- [x] Implement database persistence (mercuriale mode)
- [x] Implement database persistence (ficheTechnique mode)
- [x] Write comprehensive unit tests (10 tests)
- [x] Create seed script for sample data
- [x] Write API documentation with examples
- [x] Update README with module info
- [x] Pass all linting checks
- [x] Pass all tests
- [x] Pass security scan (CodeQL)
- [x] Address code review feedback

## 🎓 Code Review Improvements

Addressed all code review feedback:
- ✅ Added proper `CommitResult` interface instead of `any`
- ✅ Extracted magic number to `MIN_LINE_LENGTH` constant
- ✅ Improved `ordre` increment readability (separate line)
- ✅ All types properly defined and exported

## 🔮 Future Enhancements

Potential improvements for future PRs:
- Support for XLSX/CSV files
- Configurable parsing patterns per establishment
- Batch upload support
- Progress tracking for large files
- Machine learning for improved accuracy
- Custom field mapping configuration
- Duplicate detection and merging
- Audit trail for imports

## 📦 Deployment Notes

### Environment Variables Required
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_db"
JWT_SECRET="your-secret-key-here"
```

### Installation
```bash
npm install
npm run build
```

### Run Development Server
```bash
npm run start:dev
```

### Seed Sample Data
```bash
npm run seed:upload
```

## ✅ Ready for Review

This PR is ready for review. All tests pass, security scan complete, and documentation is comprehensive.

**Note**: This PR does NOT include:
- Schema migrations (uses existing models)
- Frontend changes (backend only)
- Authentication changes (reuses existing JWT strategy)

---

**Branch**: `feature/upload-api`  
**Base**: `main`  
**Commits**: 3 (Initial plan, Upload API implementation, Code review improvements)  
**Files Changed**: 13 files (+1,413 lines)  
**Tests**: 10/10 passing  
**Security**: 0 vulnerabilities
