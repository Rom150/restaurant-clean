/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('UploadService', () => {
  let service: UploadService;

  // Mock PrismaService
  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    prix: {
      create: jest.fn(),
    },
    ficheIngredient: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFile', () => {
    it('should throw BadRequestException if no file provided', async () => {
      await expect(service.parseFile(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should parse text content and extract items', async () => {
      // Create a mock file with plain text content
      const mockFile = {
        buffer: Buffer.from('Tomato 100g 2.50\nOnion 200g 1.50'),
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      // Mock pdf-parse to return simple text
      jest
        .spyOn(service as any, 'parsePdf')
        .mockResolvedValue('Tomato 100g 2.50\nOnion 200g 1.50');

      const result = await service.parseFile(mockFile);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.meta).toHaveProperty('textPreview');
    });

    it('should extract items with pipe-separated format', () => {
      const text = 'Potato | 500 | g | 3.50\nCarrot | 250 | g | 2.00';
      const items = (service as any).extractItems(text);

      expect(items.length).toBe(2);
      expect(items[0]).toMatchObject({
        name: 'Potato',
        quantite: 500,
        unite: 'g',
        prix: 3.5,
        confidence: 0.9,
      });
      expect(items[1]).toMatchObject({
        name: 'Carrot',
        quantite: 250,
        unite: 'g',
        prix: 2.0,
        confidence: 0.9,
      });
    });

    it('should extract items with space-separated format', () => {
      const text = 'Apple 1kg 4.50\nBanana 500g 2.50';
      const items = (service as any).extractItems(text);

      expect(items.length).toBe(2);
      expect(items[0]).toMatchObject({
        name: 'Apple',
        quantite: 1,
        unite: 'kg',
        prix: 4.5,
      });
    });

    it('should extract items with optional fields', () => {
      const text = 'Orange 200g\nGrape €3.50';
      const items = (service as any).extractItems(text);

      expect(items.length).toBe(2);
      expect(items[0].name).toBe('Orange');
      expect(items[0].quantite).toBe(200);
      expect(items[0].unite).toBe('g');
      expect(items[0].prix).toBeUndefined();

      expect(items[1].name).toBe('Grape');
      expect(items[1].prix).toBe(3.5);
    });

    it('should skip header lines', () => {
      const text = 'Product | Quantity | Unit | Price\nPotato | 500 | g | 3.50';
      const items = (service as any).extractItems(text);

      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Potato');
    });
  });

  describe('commitParsed', () => {
    it('should create products and prices for mercuriale type', async () => {
      const dto = {
        items: [
          { name: 'Tomato', quantite: 100, unite: 'g', prix: 2.5 },
          { name: 'Onion', quantite: 200, unite: 'g', prix: 1.5 },
        ],
        targetType: 'mercuriale' as const,
        metadata: {
          etablissementId: 1,
        },
      };

      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create
        .mockResolvedValueOnce({ id: 1, name: 'Tomato' })
        .mockResolvedValueOnce({ id: 2, name: 'Onion' });
      mockPrismaService.prix.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      const result = await service.commitParsed(dto);

      expect(result.success).toBe(true);
      expect(result.createdIds.products).toEqual([1, 2]);
      expect(result.createdIds.prix).toEqual([1, 2]);
      expect(mockPrismaService.product.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.prix.create).toHaveBeenCalledTimes(2);
    });

    it('should update existing products for mercuriale type', async () => {
      const dto = {
        items: [{ name: 'Tomato', quantite: 100, unite: 'g', prix: 3.0 }],
        targetType: 'mercuriale' as const,
        metadata: {
          etablissementId: 1,
        },
      };

      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 1,
        name: 'Tomato',
        price: 2.5,
      });
      mockPrismaService.product.update.mockResolvedValue({
        id: 1,
        name: 'Tomato',
        price: 3.0,
      });
      mockPrismaService.prix.create.mockResolvedValue({ id: 1 });

      const result = await service.commitParsed(dto);

      expect(result.success).toBe(true);
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ price: 3.0 }),
      });
    });

    it('should create fiche ingredients for ficheTechnique type', async () => {
      const dto = {
        items: [
          { name: 'Flour', quantite: 500, unite: 'g' },
          { name: 'Water', quantite: 300, unite: 'ml' },
        ],
        targetType: 'ficheTechnique' as const,
        metadata: {
          ficheTechniqueId: 1,
        },
      };

      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create
        .mockResolvedValueOnce({ id: 3, name: 'Flour' })
        .mockResolvedValueOnce({ id: 4, name: 'Water' });
      mockPrismaService.ficheIngredient.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      const result = await service.commitParsed(dto);

      expect(result.success).toBe(true);
      expect(result.createdIds.ficheIngredients).toEqual([1, 2]);
      expect(mockPrismaService.ficheIngredient.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.ficheIngredient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ficheId: 1,
            quantite: 500,
            unite: 'g',
            ordre: 0,
          }),
        }),
      );
    });

    it('should throw error if ficheTechniqueId is missing', async () => {
      const dto = {
        items: [{ name: 'Flour', quantite: 500, unite: 'g' }],
        targetType: 'ficheTechnique' as const,
        metadata: {},
      };

      await expect(service.commitParsed(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
