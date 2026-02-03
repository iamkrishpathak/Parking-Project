import { Sparkles } from "./sparkles"

export function SparklesDemo() {
  return (
    <div className="h-screen w-full overflow-hidden bg-dark-bg">
      <div className="mx-auto mt-32 w-full max-w-2xl">
        <div className="text-center text-3xl text-white">
          <span className="text-yellow-500">
            Trusted by experts.
          </span>

          <br />

          <span>Used by the leaders.</span>
        </div>

        <div className="mt-14 grid grid-cols-5 text-white">
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 56" fill="currentColor" className="w-full h-12">
              <path d="M34 18.2a2.2 2.2 0 012.2-2.2h8.6a2.2 2.2 0 012.2 2.2v1.7a1.1 1.1 0 01-1.1 1.1H35.1a1.1 1.1 0 01-1.1-1.1v-1.7z" />
            </svg>
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 56" fill="currentColor" className="w-full h-12">
              <path d="M51.1294 35.0449H51.4609V41H50.4859C44.1484 41 40.4825 37.3997 40.4825 31.503V28.4671L42.5495 27.9416C43.1539 27.7859 43.6999 27.4746 44.1289 27.0269C44.5579 26.5793 44.8504 26.015 44.9869 25.4117C45.1234 24.8084 45.0649 24.1662 44.8504 23.5823C44.6359 22.9985 44.2654 22.4925 43.7779 22.1033C43.2905 21.7141 42.7055 21.4805 42.0815 21.4222C41.4575 21.3638 40.8335 21.4611 40.2875 21.7335C39.722 22.006 39.254 22.4341 38.9225 22.9596C38.591 23.485 38.4155 24.0883 38.4155 24.7111V37.6916H32V24.497C32 24.1078 32.0195 23.6991 32.078 23.3099C32.6825 18.6198 36.7775 15 41.7305 15C46.2349 15 50.0179 17.9775 51.1294 22.0254C51.7144 24.1467 51.5194 26.4042 50.6029 28.4087C49.8229 30.1018 48.5554 31.5225 46.9759 32.4955C47.5219 34.6557 48.6334 35.0449 51.1294 35.0449Z" />
            </svg>
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 56" fill="currentColor" className="w-full h-12">
              <path d="M67.0023 23.6018V27.241H66.3978C65.1498 27.241 64.1749 27.5913 63.4729 28.2725C62.7709 28.9536 62.4199 29.8877 62.4199 31.0749V37.6332H58.8904V23.8159H62.4199V25.6063C63.4729 24.2635 64.7989 23.6018 66.3978 23.6018H67.0023Z" />
            </svg>
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 56" fill="currentColor" className="w-full h-12">
              <path d="M82.1538 32.009H71.4483C71.6628 32.8458 72.1698 33.5853 72.8718 34.0913C73.6128 34.6168 74.5098 34.8892 75.4068 34.8503C76.1673 34.8503 76.9278 34.6946 77.6103 34.3638C78.2343 34.0913 78.7803 33.6632 79.1898 33.1377L81.5493 35.2006C80.8083 36.0763 79.8723 36.7769 78.8193 37.244C77.7078 37.7305 76.4988 37.9835 75.2703 37.9641C73.9053 37.9835 72.5403 37.6527 71.3313 37.0105C70.1808 36.4072 69.2448 35.4925 68.5818 34.3832C67.9383 33.2545 67.5873 31.9895 67.5873 30.7051C67.5873 29.4207 67.9188 28.1362 68.5428 27.0075C69.1668 25.9177 70.0833 25.0225 71.1948 24.4192C72.3453 23.7964 73.6323 23.4656 74.9388 23.485C77.0058 23.485 78.7413 24.1662 80.1258 25.5479C81.5103 26.9296 82.2123 28.6617 82.2123 30.744C82.2513 31.1722 82.2123 31.5808 82.1538 32.009Z" />
            </svg>
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 56" fill="currentColor" className="w-full h-12">
              <path d="M104.852 24.9057C105.788 25.8398 106.275 27.0853 106.275 28.6617V37.6527H102.746V29.7126C102.746 28.8563 102.492 28.1946 102.005 27.6886C101.517 27.1826 100.854 26.9296 100.035 26.9296C99.1772 26.9296 98.4752 27.1826 97.9292 27.7081C97.3832 28.2335 97.1297 28.9147 97.1297 29.771V37.6527H93.6002V29.7126C93.6002 28.8757 93.3467 28.1946 92.8592 27.6886C92.3522 27.1826 91.6892 26.9296 90.8702 26.9296C90.4802 26.9102 90.1097 26.9686 89.7392 27.1048C89.3882 27.241 89.0567 27.4551 88.7642 27.7081C88.4912 27.9805 88.2767 28.2919 88.1402 28.6617C88.0037 29.012 87.9452 29.4012 87.9452 29.771V37.6527H84.4158V23.8353H87.9647V25.256C88.9982 24.0883 90.3632 23.5045 92.0597 23.5045C92.9567 23.485 93.8342 23.6796 94.6337 24.0883C95.3747 24.4775 95.9792 25.0419 96.4082 25.7425C97.5587 24.244 99.1187 23.485 101.108 23.485C102.668 23.5045 103.916 23.9716 104.852 24.9057Z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 h-96 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#D4AF37,transparent_70%)] before:opacity-40" />
        <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-white/20 bg-black" />
        <Sparkles
          density={1200}
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          color="#D4AF37"
        />
      </div>
    </div>
  )
}
