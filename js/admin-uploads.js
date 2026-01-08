(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '上传管理', activeKey: 'uploads' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">图片上传</div>
      <div id="uploadStatus" class="admin-alert info">请选择图片上传。</div>
      <div class="admin-form-row">
        <input class="admin-input" id="uploadFile" type="file" accept="image/*" />
        <button class="admin-button" id="uploadSubmit">上传</button>
      </div>
      <div id="uploadResult" class="admin-muted"></div>
    </div>
  `;

  const statusEl = document.getElementById('uploadStatus');
  const fileInput = document.getElementById('uploadFile');
  const submitBtn = document.getElementById('uploadSubmit');
  const resultEl = document.getElementById('uploadResult');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  async function handleUpload() {
    const file = fileInput.files[0];
    if (!file) {
      setStatus('请选择文件。', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);

    setStatus('上传中...', 'info');
    resultEl.textContent = '';
    try {
      const token = window.adminAuth.getToken();
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || '上传失败');
      }
      resultEl.innerHTML = data.data && data.data.url
        ? `上传成功：<a href="${data.data.url}" target="_blank">${data.data.url}</a>`
        : '上传成功';
      setStatus('上传完成。', 'success');
    } catch (err) {
      setStatus(err.message || '上传失败', 'error');
    }
  }

  submitBtn.addEventListener('click', handleUpload);
})();
