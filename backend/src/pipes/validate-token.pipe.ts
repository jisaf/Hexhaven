/**
 * Token Validation Pipe
 * Validates invite token format and length
 */

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateTokenPipe implements PipeTransform<string, string> {
  private readonly TOKEN_MIN_LENGTH = 20;
  private readonly TOKEN_MAX_LENGTH = 50;
  // Base64url charset: A-Z, a-z, 0-9, -, _
  private readonly BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Token must be a valid string');
    }

    if (
      value.length < this.TOKEN_MIN_LENGTH ||
      value.length > this.TOKEN_MAX_LENGTH
    ) {
      throw new BadRequestException(
        `Token length must be between ${this.TOKEN_MIN_LENGTH} and ${this.TOKEN_MAX_LENGTH} characters`,
      );
    }

    if (!this.BASE64URL_PATTERN.test(value)) {
      throw new BadRequestException('Token contains invalid characters');
    }

    return value;
  }
}
