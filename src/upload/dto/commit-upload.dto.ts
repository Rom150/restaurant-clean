import { ParsedItemDto } from './parse-response.dto';

export class CommitUploadDto {
  items: ParsedItemDto[];
  targetType: 'mercuriale' | 'ficheTechnique';
  metadata?: {
    etablissementId?: number;
    ficheTechniqueId?: number;
    notes?: string;
  };
}
