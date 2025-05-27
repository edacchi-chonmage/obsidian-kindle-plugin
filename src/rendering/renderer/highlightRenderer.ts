import { Environment } from 'nunjucks';
import dateFilter from 'nunjucks-date-filter';

import { AmazonRegions, currentAmazonRegion } from '~/amazonRegion';
import type { AmazonAccount, AmazonAccountRegion, Book, Highlight } from '~/models';
import highlightTemplateWrapper from '~/rendering//templates/highlightTemplateWrapper.njk';

import { BlockReferenceExtension } from '../nunjucks.extensions';

import { highlightTemplateVariables } from './templateVariables';
import { trimMultipleLines } from './utils';

export const HighlightIdBlockRefPrefix = '^ref-';

// Mapping of Amazon regions to timezone offsets in hours
const regionTimezones: Record<AmazonAccountRegion, number> = {
  global: 0,    // UTC
  india: 5.5,   // IST (UTC+5:30)
  japan: 9,     // JST (UTC+9)
  spain: 1,     // CET/CEST (UTC+1/+2)
  germany: 1,   // CET/CEST (UTC+1/+2)
  italy: 1,     // CET/CEST (UTC+1/+2)
  UK: 0,        // GMT/BST (UTC+0/+1)
  france: 1,    // CET/CEST (UTC+1/+2)
};

// Custom date filter that takes region into account
const regionAwareDateFilter = (date: Date, format: string): string => {
  // If date is undefined, use current date
  const inputDate = date || new Date();

  // Get the current Amazon region
  const currentRegion = currentAmazonRegion();

  // Determine the region key based on the hostname
  let regionKey: AmazonAccountRegion = 'global';

  // Check for specific regions based on hostname
  if (currentRegion.hostname.includes('amazon.co.jp')) {
    regionKey = 'japan';
  } else if (currentRegion.hostname.includes('amazon.in')) {
    regionKey = 'india';
  } else if (currentRegion.hostname.includes('amazon.es')) {
    regionKey = 'spain';
  } else if (currentRegion.hostname.includes('amazon.de')) {
    regionKey = 'germany';
  } else if (currentRegion.hostname.includes('amazon.it')) {
    regionKey = 'italy';
  } else if (currentRegion.hostname.includes('amazon.co.uk')) {
    regionKey = 'UK';
  } else if (currentRegion.hostname.includes('amazon.fr')) {
    regionKey = 'france';
  }

  const offset = regionTimezones[regionKey] || 0;

  // Clone the date to avoid modifying the original
  const adjustedDate = new Date(inputDate.getTime());

  // Apply the timezone offset
  adjustedDate.setHours(adjustedDate.getHours() + offset);

  // Use the original date filter with the adjusted date
  return dateFilter(adjustedDate, format);
};

dateFilter.setDefaultFormat('DD-MM-YYYY');

export default class HighlightRenderer {
  private nunjucks: Environment;

  constructor(private template: string) {
    this.nunjucks = new Environment(null, { autoescape: false });
    this.nunjucks.addExtension('BlockRef', new BlockReferenceExtension());
    this.nunjucks.addFilter('date', regionAwareDateFilter);
  }

  public validate(template: string): boolean {
    try {
      this.nunjucks.renderString(template ?? '', { text: '' });
      return true;
    } catch (error) {
      return false;
    }
  }

  public render(highlight: Highlight, book: Book): string {
    const templateVariables = highlightTemplateVariables(highlight, book);

    const highlightTemplate = highlightTemplateWrapper.replace('{{ content }}', this.template);

    const renderedHighlight = this.nunjucks.renderString(highlightTemplate, templateVariables);

    return trimMultipleLines(renderedHighlight);
  }
}
