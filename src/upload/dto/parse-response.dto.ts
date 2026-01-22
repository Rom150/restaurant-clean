export class ParsedItemDto {
  name: string;
  quantite?: number;
  unite?: string;
  prix?: number;
  confidence?: number;
}

export class ParseResponseDto {
  items: ParsedItemDto[];
  meta: {
    textPreview: string;
  };
}
