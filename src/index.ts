import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import type {
  HtmlRspackPlugin,
  Compiler,
  HtmlRspackPluginOptions,
  RspackPluginInstance,
} from '@rspack/core';

const cwd = process.cwd(); // workspace directory

export type Replacements = Record<string, string> | undefined;

export interface HtmlRspackPluginEnhanceForCRAOptions
  extends HtmlRspackPluginOptions {
  CRAHtmlInterpolate?: Record<string, string> | undefined;
}

export class HtmlRspackPluginEnhanceForCRA implements RspackPluginInstance {
  constructor(
    private RspackHtmlPlugin: typeof HtmlRspackPlugin,
    private options: HtmlRspackPluginEnhanceForCRAOptions = {},
    replacements?: Replacements,
  ) {
    if (options.CRAHtmlInterpolate) {
      replacements = options.CRAHtmlInterpolate;
    }

    this.options = this.enhanceOptions(options, replacements);
  }

  private escapeStringRegexp(str: string) {
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string');
    }

    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
  }

  private enhanceOptions(
    options: HtmlRspackPluginOptions,
    replacements: Replacements = {},
  ) {
    const { templateContent, template } = options;

    let htmlContent: string | undefined = undefined;
    if (template) {
      const htmlContentPath = resolve(cwd, template);
      htmlContent = readFileSync(htmlContentPath, 'utf-8');
    }

    // templateContent has a higher priority than template.
    if (templateContent) {
      htmlContent = templateContent;
    }

    // Replace the magic variables in the template using regular expressions.
    // via: %PUBLIC_URL%
    if (typeof htmlContent === 'string') {
      Object.keys(replacements).forEach(key => {
        const value = replacements[key];
        htmlContent = htmlContent!.replace(
          new RegExp('%' + this.escapeStringRegexp(key) + '%', 'g'),
          value,
        );
      });
    }

    return {
      ...options,
      templateContent: htmlContent,
    };
  }

  public apply(compiler: Compiler) {
    new this.RspackHtmlPlugin(this.options).apply(compiler);
  }
}
