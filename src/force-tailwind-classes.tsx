// This file forces Tailwind to include commonly used classes
// DO NOT DELETE - required for proper CSS generation

export const FORCE_TAILWIND_CLASSES = `
  flex flex-col flex-row grid hidden block inline-block inline-flex
  items-center items-start items-end justify-center justify-between justify-start justify-end
  gap-1 gap-2 gap-3 gap-4 gap-6 gap-8
  p-0 p-1 p-2 p-3 p-4 p-5 p-6 p-8
  px-2 px-3 px-4 px-6 px-8
  py-2 py-3 py-4 py-6 py-8
  m-0 m-1 m-2 m-3 m-4 m-6 m-8
  mx-auto my-auto
  w-full w-auto h-full h-auto max-w-full min-h-screen
  text-sm text-base text-lg text-xl text-2xl text-3xl
  font-normal font-medium font-semibold font-bold
  bg-white bg-black bg-background bg-foreground bg-card bg-primary bg-secondary bg-muted bg-accent bg-destructive
  text-white text-black text-foreground text-card-foreground text-primary text-primary-foreground text-secondary text-secondary-foreground text-muted text-muted-foreground text-accent-foreground text-destructive text-destructive-foreground
  border border-2 border-t border-b border-l border-r border-border border-input border-ring
  rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-full rounded-2xl
  shadow shadow-sm shadow-md shadow-lg shadow-xl
  hover:bg-primary hover:bg-secondary hover:bg-accent hover:bg-muted hover:text-white
  focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
  focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
  active:scale-95
  disabled:pointer-events-none disabled:opacity-50
  transition-all transition-colors duration-150 duration-200 duration-300
  absolute relative fixed sticky
  top-0 right-0 bottom-0 left-0
  z-10 z-20 z-30 z-40 z-50
  overflow-hidden overflow-auto overflow-scroll
  whitespace-nowrap whitespace-normal
  truncate text-ellipsis
  cursor-pointer cursor-not-allowed
  select-none
  pointer-events-none
  sr-only
  space-x-2 space-y-2 space-x-4 space-y-4
  divide-y divide-x
  opacity-0 opacity-50 opacity-100
  scale-0 scale-50 scale-95 scale-100 scale-105
  rotate-0 rotate-45 rotate-90 rotate-180
  translate-x-0 translate-y-0
  h-8 h-9 h-10 h-11 h-12 h-16 h-20 h-24 h-32 h-40 h-48 h-64
  w-8 w-9 w-10 w-11 w-12 w-16 w-20 w-24 w-32 w-40 w-48 w-64
  size-4 size-5 size-6 size-8 size-9 size-10 size-12 size-16
  min-w-0 min-w-full max-w-xs max-w-sm max-w-md max-w-lg max-w-xl max-w-2xl max-w-3xl max-w-4xl max-w-5xl max-w-6xl max-w-7xl
  leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose
  tracking-tighter tracking-tight tracking-normal tracking-wide tracking-wider tracking-widest
  underline underline-offset-4 no-underline
  capitalize uppercase lowercase
  italic not-italic
  text-left text-center text-right text-justify
  align-baseline align-top align-middle align-bottom align-text-top align-text-bottom
  break-words break-all break-normal
  ring-offset-background
  data-[state=open]:animate-in data-[state=closed]:animate-out
  data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
  data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
  data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
  dark:bg-background dark:text-foreground dark:border-border
  dark:bg-primary dark:bg-secondary dark:bg-muted dark:bg-accent
  dark:text-primary-foreground dark:text-secondary-foreground dark:text-muted-foreground dark:text-accent-foreground
  dark:hover:bg-primary/90 dark:hover:bg-secondary/80 dark:hover:bg-accent/50
  group-hover:opacity-100 group-hover:scale-105
  peer-focus:ring-2
  placeholder:text-muted-foreground
  file:border-0 file:bg-transparent
  outline-none outline-offset-2
  ring-0 ring-1 ring-2 ring-4 ring-offset-0 ring-offset-2 ring-offset-4
  grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6 grid-cols-12
  col-span-1 col-span-2 col-span-3 col-span-4 col-span-6 col-span-12
  row-span-1 row-span-2 row-span-3 row-span-4
  auto-rows-min
  bg-primary/90 bg-secondary/80 bg-destructive/90 bg-accent/50 bg-muted/50
  text-opacity-50 text-opacity-75 text-opacity-100
  backdrop-blur backdrop-blur-sm backdrop-blur-md
  bg-gradient-to-r bg-gradient-to-l bg-gradient-to-t bg-gradient-to-b
  from-primary to-secondary
  animate-spin animate-ping animate-pulse animate-bounce
  animate-accordion-down animate-accordion-up
  container
  aspect-square aspect-video
  object-cover object-contain object-fill object-none object-scale-down
  object-bottom object-center object-left object-left-bottom object-left-top object-right object-right-bottom object-right-top object-top
  inset-0 inset-x-0 inset-y-0
  start-0 end-0
  grow shrink shrink-0
  basis-0 basis-full
  self-auto self-start self-end self-center self-stretch self-baseline
  justify-self-auto justify-self-start justify-self-end justify-self-center justify-self-stretch
  content-normal content-center content-start content-end content-between content-around content-evenly content-baseline content-stretch
  will-change-auto will-change-scroll will-change-contents will-change-transform
  scroll-smooth
  snap-none snap-x snap-y snap-both snap-mandatory snap-proximity
  snap-start snap-end snap-center snap-align-none
  touch-auto touch-none touch-pan-x touch-pan-y touch-pinch-zoom touch-manipulation
  border-collapse border-separate
  table-auto table-fixed
  caption-top caption-bottom
  list-inside list-outside list-none list-disc list-decimal
  appearance-none
  columns-1 columns-2 columns-3 columns-4
  break-before-auto break-before-avoid break-before-all break-before-avoid-page break-before-page break-before-left break-before-right break-before-column
`;
