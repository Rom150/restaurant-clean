export class CommitItemDto {
  name!: string;
  quantite?: number;
  unite?: string;
  prix?: number;
}

export class CommitUploadDto {
  items!: CommitItemDto[];
  targetType!: 'mercuriale' | 'ficheTechnique';
  metadata?: {
    ficheTechniqueId?: number;
    produitId?: number;
    etablissementId?: number;
  };
}
