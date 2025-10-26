import { Transform, type TransformCallback } from "stream";
import type {
  StreamFormatter,
  TableData,
  RowData,
  TablyfulOptions,
  ReadableStream,
} from "@/types";
import { BaseFormatterImpl } from "./base-formatter.mts";

/**
 * Abstract base class for stream-based formatters.
 * Extends BaseFormatterImpl and adds streaming capabilities.
 */
export abstract class StreamFormatterImpl
  extends BaseFormatterImpl
  implements StreamFormatter
{
  /**
   * Indicates that this formatter supports streaming.
   */
  public readonly supportsStreaming = true;

  /**
   * Format table data as a readable stream.
   * @param data - The table data to format.
   * @param options - Optional formatting options.
   * @returns A readable stream of formatted output.
   */
  public formatStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream {
    const processedData = this._processData(data, options);
    return this._createFormatStream(processedData, options);
  }

  /**
   * Create a transform stream for formatting the data.
   * Must be implemented by subclasses.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of formatted output.
   */
  protected abstract _createFormatStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream;

  /**
   * Create a base transform stream with common functionality.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns A transform stream.
   */
  protected _createBaseTransform(
    data: TableData,
    options?: TablyfulOptions
  ): Transform {
    const batchSize = options?.batchSize || 100;
    let headerWritten = false;
    let footerNeeded = true;
    let rowIndex = 0;
    let currentBatch: RowData[] = [];

    const transform = new Transform({
      objectMode: true,
      highWaterMark: options?.highWaterMark || 16,
      transform: (
        chunk: RowData,
        encoding: BufferEncoding,
        callback: TransformCallback
      ) => {
        try {
          // Write header on first chunk
          if (!headerWritten) {
            const header = this._formatHeader(data, options);
            if (header) {
              transform.push(header);
            }
            headerWritten = true;
          }

          // Add row to current batch
          currentBatch.push(chunk);

          // Process batch when it reaches the batch size
          if (currentBatch.length >= batchSize) {
            const formattedBatch = this._formatRowBatch(
              currentBatch,
              data,
              rowIndex,
              options
            );
            if (formattedBatch) {
              transform.push(formattedBatch);
            }
            rowIndex += currentBatch.length;
            currentBatch = [];
          }

          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
      flush: (callback: TransformCallback) => {
        try {
          // Process remaining rows in the batch
          if (currentBatch.length > 0) {
            const formattedBatch = this._formatRowBatch(
              currentBatch,
              data,
              rowIndex,
              options
            );
            if (formattedBatch) {
              transform.push(formattedBatch);
            }
          }

          // Write footer if needed
          if (footerNeeded) {
            const footer = this._formatFooter(data, options);
            if (footer) {
              transform.push(footer);
            }
          }

          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });

    // Feed the data into the transform stream
    this._feedData(transform, data);

    return transform;
  }

  /**
   * Feed table data into the transform stream.
   * @param stream - The transform stream.
   * @param data - The table data.
   */
  protected _feedData(stream: Transform, data: TableData): void {
    // Write all rows to the stream
    for (const row of data.rows) {
      stream.write(row);
    }

    // Signal end of input
    stream.end();
  }

  /**
   * Format the header section for streaming output.
   * Can be overridden by subclasses.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The formatted header string, or null if no header needed.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    // Default implementation - no header
    // Subclasses can override to add format-specific headers
    return null;
  }

  /**
   * Format a batch of rows for streaming output.
   * Must be implemented by subclasses.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch string.
   */
  protected abstract _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string;

  /**
   * Format the footer section for streaming output.
   * Can be overridden by subclasses.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The formatted footer string, or null if no footer needed.
   */
  protected _formatFooter(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    // Default implementation - no footer
    // Subclasses can override to add format-specific footers
    return null;
  }

  /**
   * Helper method to format a single row.
   * @param row - The row data.
   * @param headers - The table headers.
   * @param options - The formatting options.
   * @returns The formatted row string.
   */
  protected _formatSingleRow(
    row: RowData,
    headers: string[],
    options?: TablyfulOptions
  ): string {
    const values = headers.map((header) => {
      const value = this._sanitizeValue(row[header]);
      return this._escapeString(value);
    });

    return this._joinRowValues(values, options);
  }

  /**
   * Join row values into a formatted string.
   * Must be implemented by subclasses for format-specific joining.
   * @param values - The sanitized and escaped values.
   * @param options - The formatting options.
   * @returns The joined row string.
   */
  protected abstract _joinRowValues(
    values: string[],
    options?: TablyfulOptions
  ): string;

  /**
   * Create a simple readable stream from processed data.
   * Useful for subclasses that don't need complex streaming logic.
   * @param data - The processed table data.
   * @param options - The formatting options.
   * @returns A readable stream.
   */
  protected _createSimpleStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream {
    const formattedData = this._formatData(data, options);

    const { Readable } = require("stream");

    return new Readable({
      read() {
        this.push(formattedData);
        this.push(null); // End the stream
      },
    });
  }
}
