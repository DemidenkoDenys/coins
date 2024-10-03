export const cloneImageAndExpand = (image: any) => {
  const rect = image.getBoundingClientRect();
  const imageExpanded = image.cloneNode(true) as HTMLImageElement;

  imageExpanded.classList.add('clone');
  imageExpanded.style.top = `${rect.top}px`;
  imageExpanded.style.left = `${rect.left}px`;

  setTimeout(() => {
    imageExpanded.style.top = `${window.innerHeight / 2 - 250}px`;
    imageExpanded.style.left = `${window.innerWidth / 2 - 250}px`;
    imageExpanded.style.width = '500px';
    imageExpanded.style.height = '500px';
  }, 100);

  return imageExpanded;
};
