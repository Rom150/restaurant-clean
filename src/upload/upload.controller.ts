import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UploadService } from './upload.service';
import { ParseResponseDto } from './dto/parse-response.dto';
import { CommitUploadDto } from './dto/commit-upload.dto';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('parse')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async parse(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ParseResponseDto> {
    return this.uploadService.parseFile(file);
  }

  @Post('commit')
  @UseGuards(AuthGuard('jwt'))
  async commit(@Body() dto: CommitUploadDto, @Request() req: any) {
    return this.uploadService.commitParsed(dto, req.user);
  }
}
