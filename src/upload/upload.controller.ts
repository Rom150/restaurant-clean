import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CommitUploadDto } from './dto/commit-upload.dto';

@Controller('api/upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private uploadService: UploadService) {}

  /**
   * POST /api/upload/parse
   * Accepts multipart/form-data with a 'file' field (PDF, JPG, PNG)
   * Returns parsed items and text preview
   */
  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parse(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadService.parseFile(file);
  }

  /**
   * POST /api/upload/commit
   * Accepts JSON body with parsed items and metadata
   * Persists records to the database
   */
  @Post('commit')
  async commit(@Body() dto: CommitUploadDto) {
    return this.uploadService.commitParsed(dto);
  }
}
