import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { MercModule } from './merc.module';

describe('MercController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MercModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/merc/import (POST) should parse and return expected payload', async () => {
    const payload = { text: 'tomate\npommes\nfromage' };
    const res = await request(app.getHttpServer())
      .post('/merc/import')
      .send(payload);

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toEqual({
      parsed: ['tomate', 'pommes', 'fromage'],
      valid: ['tomate', 'pommes', 'fromage'],
      duplicates: [],
      toAdd: ['tomate', 'pommes', 'fromage'],
    });
  });
});
