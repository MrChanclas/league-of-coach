import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  // Sin el segundo parámetro (ArgumentMetadata) de PipeTransform: este pipe
  // valida contra un esquema fijo, así que no necesita saber si el valor
  // viene del body, de la query o de un parámetro de ruta.
  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: issues,
      });
    }

    return result.data;
  }
}
