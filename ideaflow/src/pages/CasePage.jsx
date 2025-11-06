import React, { useState, useEffect } from 'react';
import styles from './ProjectsPage.module.css';
import { Link } from 'react-router-dom';

export default function CasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/cases?status=open')
      .then(res => res.json())
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const topics = ['Мобильное приложение', 'Веб-приложение', 'Редизайн сайта', 'Брендинг'];

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const filteredCases = cases.filter(({ title, theme, description, cover, files, status, executorId, userId, userEmail, executorEmail }) => {
    const lowerSearch = searchTerm.toLowerCase();

    const matchesSearch =
      (title?.toLowerCase() || '').includes(lowerSearch) ||
      (theme?.toLowerCase() || '').includes(lowerSearch) ||
      (description?.toLowerCase() || '').includes(lowerSearch) ||
      (cover?.toLowerCase() || '').includes(lowerSearch) ||
      (status?.toLowerCase() || '').includes(lowerSearch) ||
      (executorId !== undefined ? String(executorId).includes(lowerSearch) : false) ||
      (userEmail?.toLowerCase() || '').includes(lowerSearch) ||
      (executorEmail?.toLowerCase() || '').includes(lowerSearch);

    const matchesTopic = selectedTopics.length === 0 || selectedTopics.includes(theme);
    const matchesStatus = status === 'open';

    return matchesSearch && matchesTopic && matchesStatus;
  });

  if (loading) return <p className={styles.loadingText}>Загрузка кейсов...</p>;

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

      <main className={styles.projectsMain} style={{ position: 'relative' }}>
        <h1 className={styles.projectsTitle}>Открытые проекты</h1>
        <div className={styles.projectsControls}>
          <button className={styles.projectsFilter} onClick={() => setFilterOpen(true)}>
            Фильтр
            <img src="images/filter-icon.svg" alt="Фильтр" className={styles.filterIcon} />
          </button>
          <div className={styles.projectsSearchWrapper}>
            <input
              className={styles.projectsSearch}
              type="text"
              placeholder="Поиск"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className={styles.projectsSearchBtn}>
              <img src="images/search-icon.svg" alt="Поиск" className={styles.searchIcon} />
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className={styles.modalOverlay} onClick={() => setFilterOpen(false)}>
            <div className={styles.filterSidebar} onClick={e => e.stopPropagation()}>
              <h3 className={styles.filterTitle}>Фильтр по теме</h3>
              <ul className={styles.filterList}>
                {topics.map(topic => (
                  <li key={topic} className={styles.filterItem}>
                    <label className={styles.filterLabel}>
                      <input
                        type="checkbox"
                        name="topicFilter"
                        value={topic}
                        checked={selectedTopics.includes(topic)}
                        onChange={() => toggleTopic(topic)}
                        className={styles.filterCheckbox}
                      />
                      {topic}
                    </label>
                  </li>
                ))}
                <li className={styles.filterItem}>
                  <button
                    onClick={() => {
                      setSelectedTopics([]);
                      setFilterOpen(false);
                    }}
                    className={styles.resetButton}
                  >
                    Сбросить
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        <p className={styles.projectsRecommendation}>Рекомендации для вас</p>
        <div className={styles.projectsGrid}>
          {filteredCases.map(caseItem => (
            <Link to={`/cases/${caseItem.id}`} key={caseItem.id} className={styles.projectCardLink}>
              <div className={styles.projectCard}>
                <img
                  className={styles.projectImage}
                  src={`http://localhost:3001${caseItem.cover || ''}`}
                  alt="Обложка кейса"
                />
                <div className={styles.projectInfo}>
                  <div className={styles.projectPerformer}>
                    Заказчик:{' '}
                    {/* Здесь убрали вложенный Link в Link: заменено на span с Link вне карточки */}
                    <span>
                      <Link to={`/profileview/${caseItem.userId}`}>
                        {caseItem.userEmail || 'Не указан'}
                      </Link>
                    </span>
                  </div>
                  <div className={styles.projectTitle}>Название: {caseItem.title}</div>
                  <div className={styles.projectTopic}>Тема: {caseItem.theme || 'Не указана'}</div>
                  {caseItem.executorId && (
                    <div className={styles.projectPerformer}>
                      Исполнитель:{' '}
                      <span>
                        <Link to={`/profileview/${caseItem.executorId}`}>
                          {caseItem.executorEmail || 'Не указан'}
                        </Link>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

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
            <a href="#"><img src="images/facebook.svg" alt="Facebook" /></a>
            <a href="#"><img src="images/twitterx.svg" alt="Twitter" /></a>
            <a href="#"><img src="images/instagram.svg" alt="Instagram" /></a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}
