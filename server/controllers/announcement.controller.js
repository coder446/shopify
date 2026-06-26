import Announcement from "../models/Announcement.js";
import shopify from "../shopify.js";
import mongoose from "mongoose";

export const createAnnouncement = async (req, res) => {
  try {
    const { text } = req.body;
    const session = res.locals.shopify.session;
    const shop = session.shop;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Step 1: Save announcement in MongoDB
    const announcement = new Announcement({
      shop,
      text,
    });
    await announcement.save();

    // Step 2 & 3: Call Shopify GraphQL Admin API and Update Shop Metafield
    const client = new shopify.api.clients.Graphql({ session });

    try {
      const shopQuery = `
        query {
          shop {
            id
          }
        }
      `;
      const shopRes = await client.request(shopQuery);
      const shopId = shopRes.data.shop.id;

      const metafieldMutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [
          {
            namespace: announcement.namespace,
            key: announcement.key,
            type: "single_line_text_field",
            value: text,
            ownerId: shopId,
          },
        ],
      };

      const metafieldRes = await client.request(metafieldMutation, { variables });

      if (metafieldRes.data.metafieldsSet.userErrors.length > 0) {
        throw new Error(metafieldRes.data.metafieldsSet.userErrors[0].message);
      }

      // Step 4: If Shopify update succeeds
      announcement.syncedToShopify = true;
      announcement.shopifyMetafieldId = metafieldRes.data.metafieldsSet.metafields[0].id;
      await announcement.save();

    } catch (shopifyError) {
      console.error("Shopify Metafield Error:", shopifyError);
      // Otherwise: syncedToShopify = false
      announcement.syncedToShopify = false;
      await announcement.save();
      return res.status(500).json({ error: "Failed to sync to Shopify", details: shopifyError.message });
    }

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAnnouncementHistory = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shop = session.shop;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const query = { shop };
    if (search) {
      query.text = { $regex: search, $options: "i" };
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Announcement.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: announcements,
      totalCount,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getLatestAnnouncement = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shop = session.shop;

    const latestAnnouncement = await Announcement.findOne({ shop }).sort({ createdAt: -1 });

    res.status(200).json(latestAnnouncement || { text: "" });
  } catch (error) {
    console.error("Error fetching latest announcement:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAnnouncementStats = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shop = session.shop;

    const total = await Announcement.countDocuments({ shop });
    const synced = await Announcement.countDocuments({ shop, syncedToShopify: true });
    const failed = await Announcement.countDocuments({ shop, syncedToShopify: false });
    const latest = await Announcement.findOne({ shop }).sort({ createdAt: -1 });

    const all = await Announcement.find({ shop }, 'text');
    const avgLength = all.length > 0 
      ? Math.round(all.reduce((acc, curr) => acc + (curr.text ? curr.text.length : 0), 0) / all.length) 
      : 0;

    res.status(200).json({
      total,
      synced,
      failed,
      currentActive: latest ? latest.text : "",
      averageLength: avgLength
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSystemStatus = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    let shopifyStatus = "Connected";
    try {
      await client.request(`query { shop { id } }`);
    } catch (err) {
      shopifyStatus = "Failed";
    }

    const mongoStatus = mongoose.connection.readyState === 1 ? "Connected" : "Failed";

    res.status(200).json({
      mongodb: mongoStatus,
      shopify: shopifyStatus,
      themeExtension: shopifyStatus === "Connected" ? "Active" : "Failed",
      appEmbed: shopifyStatus === "Connected" ? "Enabled" : "Failed",
    });
  } catch (error) {
    console.error("Error fetching system status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
