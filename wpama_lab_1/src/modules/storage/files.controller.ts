import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { StorageService } from './storage.service';
import { FileResponseDto } from './dto/file-response.dto';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

@ApiTags('Files')
@Controller('files')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Загрузка файла' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Файл успешно загружен',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Недопустимый тип или размер файла',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ): Promise<FileResponseDto> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    const fileDoc = await this.storageService.uploadFile(file, userId);
    return {
      id: (fileDoc._id as any).toString(),
      originalName: fileDoc.originalName,
      size: fileDoc.size,
      mimetype: fileDoc.mimetype,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Скачивание файла' })
  @ApiResponse({ status: 200, description: 'Файл успешно скачан' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async downloadFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    const { stream, metadata } = await this.storageService.getFileStream(
      id,
      userId,
    );

    res.setHeader('Content-Type', metadata.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${metadata.originalName}"`,
    );
    res.setHeader('Content-Length', metadata.size);

    stream.pipe(res);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление файла' })
  @ApiResponse({ status: 204, description: 'Файл успешно удален' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async deleteFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    await this.storageService.deleteFile(id, userId);
  }
}
