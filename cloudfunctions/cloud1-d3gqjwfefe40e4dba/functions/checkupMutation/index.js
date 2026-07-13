const cloud = require('wx-server-sdk');

const { createCheckupMutationHandler } = require('./mutationHandler');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function createTransactionAdapter(transaction) {
  let documentId = '';

  return {
    async findOwnedCheckup(id, openid) {
      const byOpenId = await transaction
        .collection('checkups')
        .where({ id, _openid: openid })
        .limit(1)
        .get();

      const matched = byOpenId.data[0];
      if (matched?._id) {
        documentId = matched._id;
        return matched;
      }

      const byUserId = await transaction
        .collection('checkups')
        .where({ id, userId: openid })
        .limit(1)
        .get();
      const legacyMatched = byUserId.data[0];
      if (legacyMatched?._id) {
        documentId = legacyMatched._id;
        return legacyMatched;
      }

      return null;
    },
    async updateCheckup(_id, payload) {
      if (!documentId) {
        throw new Error('检查提醒不存在或无权访问');
      }

      const result = await transaction
        .collection('checkups')
        .doc(documentId)
        .update({ data: payload });
      if (result.stats.updated !== 1) {
        throw new Error('检查提醒未实际更新');
      }
    }
  };
}

const mutateCheckup = createCheckupMutationHandler({
  runTransaction: (task) =>
    db.runTransaction((transaction) => task(createTransactionAdapter(transaction)))
});

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    throw new Error('无法获取用户身份');
  }

  return mutateCheckup({ ...event, openid: OPENID });
};
