/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParseResponseDto, ParsedItemDto } from './dto/parse-response.dto';
import { CommitUploadDto } from './dto/commit-upload.dto';

// Import pdf-parse with require for compatibility
const pdfParse = require('pdf-parse');

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse uploaded file (PDF or image) and extract structured items
   */
  async parseFile(file: Express.Multer.File): Promise<ParseResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let textContent = '';

    // Short-circuit: if PDF, use pdf-parse; else perform basic OCR/text extraction
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        textContent = pdfData.text;
      } catch {
        throw new BadRequestException('Failed to parse PDF file');
      }
    } else if (
      file.mimetype.startsWith('image/') ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      // For images/XLSX, we would use OCR (tesseract) or Excel parsing
      // For now, return a basic fallback message
      textContent = `[Image/XLSX file uploaded: ${file.originalname}]\nManual parsing required or implement OCR/Excel parser.`;
    } else {
      throw new BadRequestException(
        'Unsupported file type. Only PDF, images, and XLSX are supported.',
      );
    }

    // Extract items using heuristics
    const items = this.extractItemsFromText(textContent);

    return {
      items,
      meta: {
        textPreview: textContent.substring(0, 500), // First 500 chars
      },
    };
  }

  /**
   * Extract structured items from text using simple heuristics
   */
  private extractItemsFromText(text: string): ParsedItemDto[] {
    const items: ParsedItemDto[] = [];
    const lines = text.split('\n');

    // Simple heuristic: look for lines with patterns like:
    // "Product Name 10 kg 5.50"
    // "Tomatoes 2.5 kg 3.20"
    const itemPattern =
      /^(.+?)\s+(\d+\.?\d*)\s*(kg|g|L|ml|unit|pcs|u)?\s*(\d+\.?\d*)?\s*€?$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;

      const match = trimmed.match(itemPattern);
      if (match) {
        const [, name, quantite, unite, prix] = match;
        items.push({
          name: name.trim(),
          quantite: quantite ? parseFloat(quantite) : undefined,
          unite: unite?.toLowerCase() || 'unit',
          prix: prix ? parseFloat(prix) : undefined,
          confidence: 0.7, // Basic confidence score
        });
      } else {
        // If no pattern match, check if line looks like a product name
        // (contains letters, reasonable length)
        if (
          trimmed.length > 2 &&
          trimmed.length < 100 &&
          /[a-zA-Z]/.test(trimmed)
        ) {
          items.push({
            name: trimmed,
            confidence: 0.4, // Lower confidence for name-only extraction
          });
        }
      }
    }

    return items;
  }

  /**
   * Commit parsed items to database
   */
  async commitParsed(dto: CommitUploadDto, user: { establishmentId?: number }) {
    const { items, targetType, metadata } = dto;
    const etablissementId = metadata?.etablissementId || user.establishmentId;

    if (targetType === 'mercuriale') {
      return this.commitMercuriale(items, etablissementId);
    } else if (targetType === 'ficheTechnique') {
      return this.commitFicheTechnique(items, metadata);
    } else {
      throw new BadRequestException('Invalid targetType');
    }
  }

  /**
   * Commit mercuriale items (products with prices)
   */
  private async commitMercuriale(
    items: ParsedItemDto[],
    etablissementId?: number,
  ) {
    const results: Array<{
      productId: number;
      prixId: number | null;
      name: string;
    }> = [];

    for (const item of items) {
      // Find or create product
      let product = await this.prisma.product.findFirst({
        where: { name: item.name },
      });

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            name: item.name,
            price: item.prix || 0,
            prixParDefaut: item.prix,
            uniteParDefaut: item.unite || 'unit',
          },
        });
      } else if (item.prix) {
        // Update existing product
        product = await this.prisma.product.update({
          where: { id: product.id },
          data: {
            price: item.prix,
            prixParDefaut: item.prix,
            uniteParDefaut: item.unite || undefined,
          },
        });
      }

      // Create prix entry if price is provided
      let prixEntry: { id: number } | null = null;
      if (item.prix && etablissementId) {
        prixEntry = await this.prisma.prix.create({
          data: {
            produitId: product.id,
            etablissementId,
            montant: item.prix,
            devise: 'EUR',
            valableDepuis: new Date(),
          },
        });
      }

      results.push({
        productId: product.id,
        prixId: prixEntry?.id || null,
        name: product.name,
      });
    }

    return {
      targetType: 'mercuriale',
      created: results,
      count: results.length,
    };
  }

  /**
   * Commit fiche technique items
   */
  private async commitFicheTechnique(
    items: ParsedItemDto[],
    metadata?: CommitUploadDto['metadata'],
  ) {
    if (!metadata?.ficheTechniqueId) {
      throw new BadRequestException(
        'ficheTechniqueId required for ficheTechnique targetType',
      );
    }

    const ficheId = metadata.ficheTechniqueId;

    // Verify fiche exists
    const fiche = await this.prisma.ficheTechnique.findUnique({
      where: { id: ficheId },
    });

    if (!fiche) {
      throw new BadRequestException('FicheTechnique not found');
    }

    const results: Array<{
      ficheIngredientId: number;
      productId: number;
      name: string;
    }> = [];

    for (const item of items) {
      // Find or create product
      let product = await this.prisma.product.findFirst({
        where: { name: item.name },
      });

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            name: item.name,
            price: item.prix || 0,
            prixParDefaut: item.prix,
            uniteParDefaut: item.unite || 'unit',
          },
        });
      }

      // Create ficheIngredient
      const ficheIngredient = await this.prisma.ficheIngredient.create({
        data: {
          ficheId,
          ingredientId: product.id,
          quantite: item.quantite || 1,
          unite: item.unite || 'unit',
          ordre: 0,
        },
      });

      results.push({
        ficheIngredientId: ficheIngredient.id,
        productId: product.id,
        name: product.name,
      });
    }

    return {
      targetType: 'ficheTechnique',
      ficheId,
      created: results,
      count: results.length,
    };
  }
}
