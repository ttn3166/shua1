const { customAlphabet } = require('nanoid');

const orderAlphabet = '0123456789';
const orderId = customAlphabet(orderAlphabet, 10);

function generateOrderNo() {
  return orderId();
}

function applyScope(user, baseQuery, params = {}) {
  if (!user) return { query: baseQuery, params };
  if (user.role === 'SuperAdmin') return { query: baseQuery, params };
  if (user.scope === 'agent' && user.agent_id) {
    return {
      query: `${baseQuery} WHERE agent_id = @agent_id`,
      params: { ...params, agent_id: user.agent_id }
    };
  }
  if (user.scope === 'staff' && user.staff_id) {
    return {
      query: `${baseQuery} WHERE staff_id = @staff_id`,
      params: { ...params, staff_id: user.staff_id }
    };
  }
  if (user.scope === 'self') {
    return {
      query: `${baseQuery} WHERE id = @id`,
      params: { ...params, id: user.id }
    };
  }
  return { query: baseQuery, params };
}

function buildScopeFilter(user, tableAlias = 'users') {
  if (!user || user.role === 'SuperAdmin') {
    return { clause: '', params: {} };
  }
  if (user.scope === 'agent' && user.agent_id) {
    return { clause: `${tableAlias}.agent_id = @agent_id`, params: { agent_id: user.agent_id } };
  }
  if (user.scope === 'staff' && user.staff_id) {
    return { clause: `${tableAlias}.staff_id = @staff_id`, params: { staff_id: user.staff_id } };
  }
  if (user.scope === 'self') {
    return { clause: `${tableAlias}.id = @id`, params: { id: user.id } };
  }
  return { clause: '', params: {} };
}

module.exports = { generateOrderNo, applyScope, buildScopeFilter };
