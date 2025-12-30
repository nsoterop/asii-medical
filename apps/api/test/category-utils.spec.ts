import { buildCategoryNodes } from '../src/imports/category-utils';

describe('buildCategoryNodes', () => {
  it('expands paths into ancestor nodes', () => {
    const nodes = buildCategoryNodes(['Dental Merchandise>Anesthetics>Topicals']);
    const paths = nodes.map((node) => node.path).sort();

    expect(paths).toEqual([
      'Dental Merchandise',
      'Dental Merchandise>Anesthetics',
      'Dental Merchandise>Anesthetics>Topicals',
    ]);

    const topicals = nodes.find((node) => node.path === 'Dental Merchandise>Anesthetics>Topicals');
    expect(topicals).toMatchObject({
      name: 'Topicals',
      parentPath: 'Dental Merchandise>Anesthetics',
      depth: 3,
    });
  });
});
