import { getUniqueSlug } from '../dashboard/components/SingleProject/GalleryComponent';
jest.mock('lucide-react', () => ({ GalleryVerticalEnd: () => null }));
describe('getUniqueSlug', () => {
    it('increments slug when duplicate exists', () => {
        const galleries = [{ slug: 'design-board' }];
        const { slug } = getUniqueSlug('design-board', galleries, []);
        expect(slug).toBe('design-board-1');
    });
    it('skips to next number when suffixed slug also exists', () => {
        const galleries = [{ slug: 'design-board' }, { slug: 'design-board-1' }];
        const { slug } = getUniqueSlug('design-board', galleries, []);
        expect(slug).toBe('design-board-2');
    });
});
