/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-require-imports */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParseResponseDto, ParsedItemDto } from './dto/parse-response.dto';
import { CommitUploadDto } from './dto/commit-upload.dto';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse uploaded file (PDF or image) and extract structured data
   */
  async parseFile(file: Express.Multer.File): Promise<ParseResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let text = '';

    // Short-circuit: if PDF, use pdf-parse, else use OCR
    if (file.mimetype === 'application/pdf') {
      text = await this.parsePdf(file.buffer);
    } else if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png'
    ) {
      text = await this.parseImage(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file type. Please upload PDF, JPG, or PNG.',
      );
    }

    // Extract items using heuristics
    const items = this.extractItems(text);

    return {
      items,
      meta: {
        textPreview: text.substring(0, 500),
      },
    };
  }

  /**
   * Parse PDF file using pdf-parse
   */
  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      // Use dynamic require for pdf-parse due to CJS/ESM compatibility
      const pdfParseModule = require('pdf-parse');
      const data = await pdfParseModule(buffer);
      return data.text;
    } catch (error) {
      throw new BadRequestException(
        'Failed to parse PDF: ' + (error as Error).message,
      );
    }
  }

  /**
   * Parse image file using Tesseract OCR
   */
  private async parseImage(buffer: Buffer): Promise<string> {
    try {
      const result = await Tesseract.recognize(buffer, 'eng');
      return result.data.text;
    } catch (error) {
      throw new BadRequestException(
        'Failed to perform OCR on image: ' + (error as Error).message,
      );
    }
  }

  /**
   * Extract structured items from text using heuristics
   * Looks for patterns like:
   * - "Product Name 100g 5.50€"
   * - "Ingredient | 250 | ml | 3.20"
   * - "Apple 1kg €4.50"
   */
  private extractItems(text: string): ParsedItemDto[] {
    const items: ParsedItemDto[] = [];
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    for (const line of lines) {
      const item = this.extractItemFromLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Extract a single item from a line of text
   * Uses regex patterns to identify product name, quantity, unit, and price
   */
  private extractItemFromLine(line: string): ParsedItemDto | null {
    // Skip lines that are too short or look like headers
    if (line.length < 3) return null;
    if (
      /^(produit|product|nom|name|prix|price|quantit|quantity|unit)/i.test(line)
    )
      return null;

    // Pattern 1: "Product Name | 100 | g | 5.50"
    const pattern1 =
      /^([^|]+)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*([a-zA-Z]+)\s*\|\s*(\d+(?:\.\d+)?)/;
    const match1 = line.match(pattern1);
    if (match1) {
      return {
        name: match1[1].trim(),
        quantite: parseFloat(match1[2]),
        unite: match1[3].toLowerCase(),
        prix: parseFloat(match1[4]),
        confidence: 0.9,
      };
    }

    // Pattern 2: "Product Name 100g 5.50€" or "Product 100 g €5.50"
    const pattern2 =
      /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+[€$]?\s*(\d+(?:\.\d+)?)/;
    const match2 = line.match(pattern2);
    if (match2) {
      return {
        name: match2[1].trim(),
        quantite: parseFloat(match2[2]),
        unite: match2[3].toLowerCase(),
        prix: parseFloat(match2[4]),
        confidence: 0.8,
      };
    }

    // Pattern 3: "Product Name 100g" (no price)
    const pattern3 = /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*$/;
    const match3 = line.match(pattern3);
    if (match3) {
      return {
        name: match3[1].trim(),
        quantite: parseFloat(match3[2]),
        unite: match3[3].toLowerCase(),
        confidence: 0.7,
      };
    }

    // Pattern 4: Just product name with optional price at the end
    const pattern4 = /^(.+?)\s+[€$]?\s*(\d+(?:\.\d+)?)\s*[€$]?\s*$/;
    const match4 = line.match(pattern4);
    if (match4) {
      return {
        name: match4[1].trim(),
        prix: parseFloat(match4[2]),
        confidence: 0.6,
      };
    }

    // Pattern 5: Just a product name (at least 3 chars, no numbers at start)
    if (!/^\d/.test(line) && line.length >= 3) {
      return {
        name: line.trim(),
        confidence: 0.5,
      };
    }

    return null;
  }

  /**
   * Commit parsed items to the database
   */
  async commitParsed(
    dto: CommitUploadDto,
  ): Promise<{ success: boolean; createdIds: any }> {
    const createdIds: any = {
      products: [],
      prix: [],
      ficheIngredients: [],
    };

    try {
      if (dto.targetType === 'mercuriale') {
        // Import as products with prices (mercuriale = price list)
        for (const item of dto.items) {
          // Find or create product
          let product = await this.prisma.product.findFirst({
            where: { name: item.name },
          });

          if (product) {
            // Update existing product
            product = await this.prisma.product.update({
              where: { id: product.id },
              data: {
                price: item.prix ?? product.price,
                prixParDefaut: item.prix ?? product.prixParDefaut,
                uniteParDefaut: item.unite ?? product.uniteParDefaut,
              },
            });
          } else {
            // Create new product
            product = await this.prisma.product.create({
              data: {
                name: item.name,
                price: item.prix ?? 0,
                prixParDefaut: item.prix,
                uniteParDefaut: item.unite ?? 'unit',
              },
            });
          }
          createdIds.products.push(product.id);

          // If price and establishment provided, create Prix entry
          if (item.prix && dto.metadata?.etablissementId) {
            const prixEntry = await this.prisma.prix.create({
              data: {
                produitId: product.id,
                etablissementId: dto.metadata.etablissementId,
                montant: item.prix,
                devise: 'EUR',
              },
            });
            createdIds.prix.push(prixEntry.id);
          }
        }
      } else if (dto.targetType === 'ficheTechnique') {
        // Import as fiche technique ingredients
        if (!dto.metadata?.ficheTechniqueId) {
          throw new BadRequestException(
            'ficheTechniqueId required for ficheTechnique target type',
          );
        }

        let ordre = 0;
        for (const item of dto.items) {
          // Find or create product (ingredient)
          let product = await this.prisma.product.findFirst({
            where: { name: item.name },
          });

          if (!product) {
            product = await this.prisma.product.create({
              data: {
                name: item.name,
                price: item.prix ?? 0,
                prixParDefaut: item.prix,
                uniteParDefaut: item.unite ?? 'unit',
              },
            });
          }

          // Create FicheIngredient entry
          const ficheIngredient = await this.prisma.ficheIngredient.create({
            data: {
              ficheId: dto.metadata.ficheTechniqueId,
              ingredientId: product.id,
              quantite: item.quantite ?? 1,
              unite: item.unite ?? 'unit',
              ordre: ordre++,
            },
          });
          createdIds.ficheIngredients.push(ficheIngredient.id);
        }
      }

      return {
        success: true,
        createdIds,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to commit parsed data: ' + (error as Error).message,
      );
    }
  }
}
