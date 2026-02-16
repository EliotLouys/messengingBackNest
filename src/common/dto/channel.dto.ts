import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ThemeDto {
  @IsString() @IsNotEmpty() primary_color: string;
  @IsString() @IsNotEmpty() primary_color_dark: string;
  @IsString() @IsNotEmpty() accent_color: string;
  @IsString() @IsNotEmpty() text_color: string;
  @IsString() @IsNotEmpty() accent_text_color: string;
}

export class ChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  img?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeDto)
  theme?: ThemeDto;
}

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}
