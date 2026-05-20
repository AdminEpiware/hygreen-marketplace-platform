import { cn } from '@/lib/utils';

const LOGO_URL =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-b90f8uvj3yf4/app-b90lb7mv1w5d/20260516/HyGreen_Logo.png';

interface HyGreenLogoProps {
  /**
   * Controls the rendered WIDTH (height scales automatically).
   * Sizing by width ensures the full "HyGreen" wordmark is always
   * visible at every zoom level without any letter clipping.
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show the tagline below the logo image */
  showTagline?: boolean;
  className?: string;
  imgClassName?: string;
}

// Width-based sizing — height is always `auto` so aspect ratio is preserved
// and all letters remain fully visible at any zoom level.
const SIZE_MAP: Record<NonNullable<HyGreenLogoProps['size']>, string> = {
  xs:  'w-[100px] md:w-[120px]',
  sm:  'w-[130px] md:w-[155px]',
  md:  'w-[155px] md:w-[185px]',
  lg:  'w-[220px] md:w-[270px]',
  xl:  'w-[300px] md:w-[380px]',
};

export function HyGreenLogo({
  size = 'md',
  showTagline = false,
  className,
  imgClassName,
}: HyGreenLogoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <img
        src={LOGO_URL}
        alt="HyGreen — More Than Grocery, It's Family."
        className={cn(
          // h-auto keeps aspect ratio; max-w-full prevents overflow inside small containers
          'h-auto max-w-full object-contain',
          SIZE_MAP[size],
          imgClassName
        )}
        loading="eager"
        decoding="async"
      />
      {showTagline && (
        <p className="text-xs text-muted-foreground tracking-wide italic text-center">
          "More Than Grocery, It's Family."
        </p>
      )}
    </div>
  );
}

export { LOGO_URL as HYGREEN_LOGO_URL };
