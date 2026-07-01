import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class AuthCredentialsDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password!: string;
}

export class RegisterDto extends AuthCredentialsDto {
  @IsString()
  @IsOptional()
  registrationCode?: string;
}

