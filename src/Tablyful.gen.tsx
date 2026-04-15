/* TypeScript file generated from Tablyful.res by genType. */

/* eslint-disable */
/* tslint:disable */

import * as TablyfulJS from './Tablyful.res.mjs';

import type {t as TableData_t} from '../src/Core/TableData.gen';

import type {t as TablyfulError_t} from '../src/Core/TablyfulError.gen';

import type {t as Types_t} from '../src/Options/Types.gen';

/** * Main Tablyful API
 * Provides high-level functions for converting data between formats */
export type result<a> = 
    { TAG: "Ok"; _0: a }
  | { TAG: "Error"; _0: TablyfulError_t };

export type tableData = TableData_t;

export type options = Types_t;

export const defaultOptions: Types_t = TablyfulJS.defaultOptions as any;

export const convert: (input:unknown, format:string, options:(undefined | options)) => result<string> = TablyfulJS.convert as any;

export const parse: (input:unknown, options:(undefined | options)) => result<TableData_t> = TablyfulJS.parse as any;

export const format: (data:tableData, format:string, options:(undefined | options)) => result<string> = TablyfulJS.format as any;

export const toCsv: (input:unknown, options:(undefined | options)) => result<string> = TablyfulJS.toCsv as any;

export const toJson: (input:unknown, options:(undefined | options)) => result<string> = TablyfulJS.toJson as any;

export const toMarkdown: (input:unknown, options:(undefined | options)) => result<string> = TablyfulJS.toMarkdown as any;

export const toHtml: (input:unknown, options:(undefined | options)) => result<string> = TablyfulJS.toHtml as any;

export const toLatex: (input:unknown, options:(undefined | options)) => result<string> = TablyfulJS.toLatex as any;

export const availableParsers: () => string[] = TablyfulJS.availableParsers as any;

export const availableFormatters: () => string[] = TablyfulJS.availableFormatters as any;

export const detectFormat: (input:unknown) => string = TablyfulJS.detectFormat as any;
