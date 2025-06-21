import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from '../create/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  // Hérite automatiquement de tous les champs de CreateCustomerDto mais en optionnel
  // Cela permet de faire des mises à jour partielles
} 