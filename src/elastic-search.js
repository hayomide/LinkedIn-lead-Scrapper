const cleanRequest = require("clean-request");
const { elasticSearchApiOrigin } = require("../config");

const createIndex = async (index, props) => {
    if (!index) return console.error("Index to create must be specified");

    const url = `${elasticSearchApiOrigin}/${index}`;

    try {
        const { statusCode: code } = await cleanRequest({
            url,
            method: "HEAD",
        });
        if (code === 200) {
            console.log(`${index} already created!`);
            return true;
        }

        const { statusCode, ...rest } = await cleanRequest({
            url,
            method: "PUT",
            body: {
                mappings: { properties: props },
            },
        });

        if (statusCode === 200) {
            console.log(`${index} created!`);
            return true;
        }

        console.log("statusCode", statusCode);
        console.log("rest", rest);

        return false;
    } catch (e) {
        console.error("Error creating Index", e);
        return false;
    }
};

const createProductIndex = () =>
    createIndex("products", {
        url: { type: "keyword" },
        title: { type: "keyword" },
        images: { type: "keyword" },
        average_ratings: { type: "rank_feature" },
        no_of_reviews: { type: "unsigned_long" },
        no_of_freebies_reviews: { type: "unsigned_long" },
        coupons: {
            properties: {
                discount: { type: "float" },
                condition: { type: "keyword" },
                start_date: { type: "date", format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ||epoch_millis" },
                end_date: { type: "date", format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ||epoch_millis" },
            },
        },
        percentage_discount: { type: "byte" },
        no_of_order: { type: "unsigned_long" },
        colors: { properties: { name: { type: "keyword" }, image: { type: "keyword" } } },
        skus: { type: "flattened" },
        additional_discount: {
            properties: {
                percentage: { type: "keyword" },
                minQuantity: { type: "keyword" },
                maxQuantity: { type: "keyword" },
            },
        },
        pieces_available: { type: "unsigned_long" },
        wishlisters: { type: "unsigned_long" },
        store_url: { type: "keyword" },
        curent_price: { properties: { max: { type: "float" }, min: { type: "float" } } },
        original_price: { properties: { max: { type: "float" }, min: { type: "float" } } },
        specifications: { type: "flattened" },
    });

module.exports = { createIndex, createProductIndex };
