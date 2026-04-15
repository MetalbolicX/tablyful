/* TypeScript file generated from TableData.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import type {dataType as Common_dataType} from './Common.gen';

export type row = {[id: string]: unknown};

export type column = {
  readonly name: string; 
  readonly dataType: Common_dataType; 
  readonly nullable: boolean
};

export type metadata = {
  readonly rowCount: number; 
  readonly columnCount: number; 
  readonly hasRowNumbers: boolean; 
  readonly sourceFormat: string
};

export type t = {
  readonly headers: string[]; 
  readonly rows: row[]; 
  readonly columns: column[]; 
  readonly metadata: metadata
};
