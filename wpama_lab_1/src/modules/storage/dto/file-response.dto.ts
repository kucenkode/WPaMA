import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID файла',
  })
  id!: string;

  @ApiProperty({ example: 'avatar.jpg', description: 'Оригинальное имя файла' })
  originalName!: string;

  @ApiProperty({ example: 1024, description: 'Размер файла в байтах' })
  size!: number;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME-тип файла' })
  mimetype!: string;
}
