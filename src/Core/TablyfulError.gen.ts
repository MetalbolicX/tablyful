/* TypeScript file generated from TablyfulError.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import type {t as Position_t} from './Position.gen';

export type category = 
    "ParseError"
  | "FormatError"
  | "ValidationError"
  | "IoError"
  | "ConfigError"
  | "StreamError";

export type t = {
  readonly category: category; 
  readonly message: string; 
  readonly position: Position_t; 
  readonly suggestion?: string; 
  readonly cause?: string; 
  readonly code?: string
};
