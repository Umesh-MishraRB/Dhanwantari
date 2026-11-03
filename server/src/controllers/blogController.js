import Blog from "../models/Blog.js";
import { HttpError } from "../utils/HttpError.js";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listBlogs(req, res) {
  const { q, category } = req.query;
  const filter = { isPublished: true };
  if (category) filter.category = String(category);
  if (q) {
    const re = new RegExp(escapeRe(String(q).slice(0, 60)), "i");
    filter.$or = [{ title: re }, { summary: re }, { category: re }];
  }
  const [blogs, categories] = await Promise.all([
    Blog.find(filter).select("-overview -symptoms -precautions -treatments -whenToSeeDoctor").sort({ title: 1 }),
    Blog.distinct("category", { isPublished: true }),
  ]);
  res.json({ blogs, categories: categories.sort() });
}

export async function getBlog(req, res) {
  const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
  if (!blog) throw new HttpError(404, "Article not found.");
  res.json({ blog });
}
