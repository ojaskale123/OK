function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit };
}

module.exports = { parsePagination };
