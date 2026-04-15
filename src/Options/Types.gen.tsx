/* TypeScript file generated from Types.res by genType. */

/* eslint-disable */
/* tslint:disable */

/** * Configuration options types */
export type format = "Csv" | "Json" | "Markdown" | "Html" | "Latex";

export type csvOptions = {
  readonly delimiter: string; 
  readonly quote: string; 
  readonly escape: string; 
  readonly lineBreak: string; 
  readonly includeHeaders: boolean
};

export type jsonOptions = {
  readonly pretty: boolean; 
  readonly indentSize: number; 
  readonly asArray: boolean
};

export type markdownOptions = {
  readonly align: string; 
  readonly padding: boolean; 
  readonly githubFlavor: boolean
};

export type htmlOptions = {
  readonly tableClass: string; 
  readonly theadClass: string; 
  readonly tbodyClass: string; 
  readonly id: string; 
  readonly caption: string
};

export type latexOptions = {
  readonly tableEnvironment: string; 
  readonly columnSpec: string; 
  readonly booktabs: boolean; 
  readonly caption: string; 
  readonly label: string; 
  readonly centering: boolean; 
  readonly useTableEnvironment: boolean
};

export type formatOptions = 
    { TAG: "CsvOptions"; _0: csvOptions }
  | { TAG: "JsonOptions"; _0: jsonOptions }
  | { TAG: "MarkdownOptions"; _0: markdownOptions }
  | { TAG: "HtmlOptions"; _0: htmlOptions }
  | { TAG: "LatexOptions"; _0: latexOptions };

export type t = {
  readonly headers: (undefined | string[]); 
  readonly hasHeaders: boolean; 
  readonly rowNumberHeader: string; 
  readonly hasRowNumbers: boolean; 
  readonly batchSize: number; 
  readonly encoding: string; 
  readonly outputFormat: format; 
  readonly formatOptions: formatOptions
};
