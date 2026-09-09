/** Shared visual contract for every Matchia banner. */
export const BANNER_WIDTH = 1600;
export const BANNER_HEIGHT = 340;
export const BANNER_ASPECT_RATIO = `${BANNER_WIDTH} / ${BANNER_HEIGHT}`;
export const BANNER_RECOMMENDED_DIMENSIONS = `${BANNER_WIDTH} × ${BANNER_HEIGHT} px`;

export const BANNER_FRAME_CLASS = 'aspect-[80/17] w-full overflow-hidden';
export const BANNER_IMAGE_CLASS = 'h-full w-full object-cover';
export const BANNER_BACKGROUND_STYLE = (url: string) => ({
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});
