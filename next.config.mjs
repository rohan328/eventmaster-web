/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/rsvp-tracking",
        destination: "/manage-attendees",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
