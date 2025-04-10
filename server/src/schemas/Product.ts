import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Product extends Document {
  @Prop({ required: true })
  productID: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  ProductDescription: number;

  @Prop({ required: true })
  ManufacturerID: string;

  @Prop({ required: true })
  ManufacturerName: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
