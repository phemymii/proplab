export default interface PageObject {
  path: string;
  breadcrumb: {
    href: string;
    title: string;
  }[];
}
