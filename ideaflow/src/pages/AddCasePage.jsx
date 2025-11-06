import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AddCasePage.module.css';

export default function AddCasePage() {
  const [projectName, setProjectName] = useState('');
  const [theme, setTheme] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [cover, setCover] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 15) {
      alert('Можно выбрать не более 15 файлов');
      e.target.value = ''; // сброс выбора в input
      return;
    }
    setFiles(selectedFiles);
  };

  const handleCoverChange = (e) => {
    if (e.target.files.length > 0) {
      setCover(e.target.files[0]);
    } else {
      setCover(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Вы не авторизованы');
      navigate('/signin');
      return;
    }

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('title', projectName);
    formData.append('theme', theme);
    formData.append('description', description);
    if (cover) {
      formData.append('cover', cover);
    }
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('http://localhost:3001/cases', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка создания кейса');
      }
      alert('Кейс успешно создан!');
      navigate('/cases');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
        </Link>
        <nav className={styles.navLinks}>
          <Link to="/profile">Профиль</Link>
          <Link to="/cases">Кейсы</Link>
          <Link to="/projects">Проекты</Link>
          <Link to="/profile">
            <button className={styles.buttonYellow}>Разместить проект</button>
          </Link>
          <Link to="/cases">
            <button className={styles.buttonYellow}>Приступить к проекту</button>
          </Link>
        </nav>
      </header>

      <div className={styles.innerContainer}>
        <h2>Описание проекта</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Укажите название проекта
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className={styles.textInput}
            />
          </label>
          <label className={styles.label}>
            Выберите тему
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              required
              className={styles.textInput}
            />
          </label>
          <label className={styles.label}>
            Опишите детально задачу и суть проекта
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className={styles.textareaInput}
            />
          </label>

          {/* Кнопка для выбора файлов */}
          <label htmlFor="attachFiles" className={styles.labelFileButton}>
            Прикрепить файлы (до 15)
          </label>
          <input
            type="file"
            id="attachFiles"
            multiple
            onChange={handleFileChange}
            className={styles.fileInputHidden}
          />
          {files.length > 0 && (
            <p>Выбрано файлов: {files.length}</p>
          )}

          {/* Кнопка для выбора обложки */}
          <label htmlFor="selectCover" className={styles.labelFileButton}>
            Выбрать обложку
          </label>
          <input
            type="file"
            id="selectCover"
            onChange={handleCoverChange}
            className={styles.fileInputHidden}
          />
          {cover && (
            <p>Выбрана обложка: {cover.name}</p>
          )}

          <button type="submit" className={styles.submitButton}>
            Разместить проект
          </button>
        </form>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a>
            <br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#">
              <img src="images/facebook.svg" alt="Facebook" />
            </a>
            <a href="#">
              <img src="images/twitterx.svg" alt="Twitter" />
            </a>
            <a href="#">
              <img src="images/instagram.svg" alt="Instagram" />
            </a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}
