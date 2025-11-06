import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import styles from './ProfileView.module.css';

export default function ProfileView() {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();

  const [userId, setUserId] = useState(paramUserId);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('projects');
  const [formData, setFormData] = useState({
    photo: '',
    firstName: '',
    lastName: '',
    username: '',
    about: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectsAsCustomer, setProjectsAsCustomer] = useState([]);
  const [completedExecutorProjects, setCompletedExecutorProjects] = useState([]);
  const [inProcessExecutorCases, setInProcessExecutorCases] = useState([]);

  const [reviews, setReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!userId) {
      navigate('/signin');
      return;
    }
    setUserId(userId);
  }, [navigate, userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/profile/${userId}`);
        if (!res.ok) throw new Error('Ошибка загрузки данных пользователя');
        const data = await res.json();
        setFormData({
          photo: data.photo || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          username: data.email || '',
          about: data.description || '',
        });
        setUserEmail(data.email || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectsAsCustomer = async () => {
      try {
        const resProjects = await fetch(`http://localhost:3001/projects?userId=${userId}`);
        if (!resProjects.ok) throw new Error('Ошибка загрузки проектов как заказчика');
        const projectsDataRaw = await resProjects.json();
        const projectsData = projectsDataRaw.filter(p => p.status === 'closed');

        const resCases = await fetch(`http://localhost:3001/cases?userId=${userId}`);
        if (!resCases.ok) throw new Error('Ошибка загрузки кейсов заказчика');
        const casesDataRaw = await resCases.json();
        const casesData = casesDataRaw.filter(c => c.status === 'open');

        const combined = [...casesData, ...projectsData];
        combined.sort((a, b) => {
          if (a.status === 'open' && b.status !== 'open') return -1;
          if (a.status !== 'open' && b.status === 'open') return 1;
          return 0;
        });

        setProjectsAsCustomer(combined);
      } catch (error) {
        console.error('Ошибка при загрузке проектов и кейсов:', error);
        setProjectsAsCustomer([]);
      }
    };

    const fetchCompletedExecutorProjects = async () => {
      try {
        const res = await fetch(`http://localhost:3001/projects?executorEmail=${encodeURIComponent(userEmail)}`);
        if (!res.ok) throw new Error('Ошибка загрузки проектов исполнителя');
        const data = await res.json();
        const closedProjects = data.filter(p => p.status === 'closed');
        setCompletedExecutorProjects(closedProjects);
      } catch {
        setCompletedExecutorProjects([]);
      }
    };

    const fetchInProcessExecutorCases = async () => {
      try {
        const res = await fetch(`http://localhost:3001/processed-cases`);
        if (!res.ok) throw new Error('Ошибка загрузки принятых кейсов');
        const data = await res.json();
        const filtered = data.filter(
          c => c.executorId === Number(userId) && c.status === 'in_process'
        );
        setInProcessExecutorCases(filtered);
      } catch {
        setInProcessExecutorCases([]);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await fetch(`http://localhost:3001/reviews?userId=${userId}`);
        if (!response.ok) throw new Error('Ошибка загрузки отзывов');
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserData().then(() => {
      fetchProjectsAsCustomer();
      fetchCompletedExecutorProjects();
      fetchInProcessExecutorCases();
      fetchReviews();
    });
  }, [userId, userEmail, navigate]);

  const renderStars = rating => (
    <>
      {[...Array(5)].map((_, idx) => {
        const starValue = idx + 1;
        return <FaStar key={idx} size={18} color={starValue <= rating ? '#ffbe5a' : '#ccc'} />;
      })}
    </>
  );

  const averageRating =
    reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;

  // Новый handleAddReview с отправкой на сервер
  const handleAddReview = async () => {
    if (newReviewText.trim() === '' || newReviewRating === 0) return;

    const newReview = {
      userId,
      reviewerName: `${formData.firstName} ${formData.lastName}`.trim() || 'Anonymous',
      reviewerPhoto: formData.photo || '',
      text: newReviewText.trim(),
      rating: newReviewRating,
    };

    try {
      const res = await fetch('http://localhost:3001/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });
      if (!res.ok) throw new Error('Ошибка добавления отзыва');
      setNewReviewText('');
      setNewReviewRating(0);
      const updatedReviews = await res.json();
      setReviews(updatedReviews);
    } catch (err) {
      alert(err.message);
    }
  };

  const formatReviewerPhoto = (photoPath) => {
    if (!photoPath) return null;
    // Если фото уже с сервера (начинается с /), добавим условно хост
    if (photoPath.startsWith('http')) return photoPath;
    if (photoPath.startsWith('/')) return `http://localhost:3001${photoPath}`;
    return photoPath;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <>
            <h3 className={styles.projectsTitle}>Проекты пользователя (заказчик)</h3>
            <div className={`${styles.tabContent} ${styles.projectsTab}`}>
              {projectsAsCustomer.map((p) => (
                <div key={p.id} className={styles.projectCard}>
                  {p.status === 'open' ? (
                    <Link to={`/cases/${p.id}`} className={styles.casesLink}>
                      <img
                        src={`http://localhost:3001${p.cover || ''}`}
                        alt={`Фото исполнителя ${p.executorEmail || 'Не указан'}`}
                        className={styles.projectImage}
                      />
                      <div className={styles.projectInfo}>
                        <div className={styles.projectTopic}>{p.theme || p.title}</div>
                        <div className={styles.projectTitle}>Название: {p.title}</div>
                        <div className={styles.projectStatus}>Статус: {p.status || 'неизвестен'}</div>
                      </div>
                    </Link>
                  ) : (
                    <Link to={`/projects/${p.id}`} className={styles.projectLink}>
                      <img
                        src={`http://localhost:3001${p.cover || ''}`}
                        alt={`Фото исполнителя ${p.executorEmail || 'Не указан'}`}
                        className={styles.projectImage}
                      />
                      <div className={styles.projectInfo}>
                        <div className={styles.projectPerformer}>
                          Исполнитель: {p.executorEmail || 'Не указан'}
                        </div>
                        <div className={styles.projectTopic}>{p.theme || p.title}</div>
                        <div className={styles.projectTitle}>Название: {p.title}</div>
                        <div className={styles.projectStatus}>Статус: {p.status || 'неизвестен'}</div>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      case 'cases':
        return (
          <div className={`${styles.tabContent} ${styles.casesTab}`}>
            <h3>Завершённые проекты пользователя (исполнитель)</h3>
            {completedExecutorProjects.length === 0 ? (
              <p>Пока пусто</p>
            ) : (
              <div className={styles.casesGrid}>
                {completedExecutorProjects.map(proj => (
                  <div key={proj.id} className={styles.caseCard}>
                    <Link to={`/projects/${proj.id}`} key={proj.id} className={styles.projCardLink}>
                      <div className={styles.projectCard}>
                        <img
                          className={styles.projectImage}
                          src={`http://localhost:3001${proj.cover || ''}`}
                          alt={`Фото исполнителя ${proj.performerEmail}`}
                        />
                        <div className={styles.projectInfo}>
                          <div className={styles.projectTopic}>{proj.theme || proj.title}</div>
                          <div className={styles.projectTitle}>Название: {proj.title}</div>
                          <div className={styles.projectStatus}>Статус: {proj.status || 'неизвестен'}</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'reviews':
        return (
          <div className={styles.reviewContainer}>
            <h3>
              Отзывы пользователя{' '}
              <span style={{ fontFamily: 'Arial', fontWeight: 'normal', fontSize: '1rem', marginLeft: '10px' }}>
                ({averageRating} ★)
              </span>
            </h3>
            <div className={styles.reviewListCustom}>
              {reviews.length === 0 ? (
                <p>Пока нет отзывов</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className={styles.reviewItemCustom}>
                    <div className={styles.reviewPhotoCustom}>
                      {r.reviewerPhoto ? (
                        <img src={formatReviewerPhoto(r.reviewerPhoto)} alt={r.reviewerName} />
                      ) : (
                        <div className={styles.userPhotoPlaceholderCustom}></div>
                      )}
                    </div>
                    <div>
                      <b>{r.reviewerName}</b>
                      <p>{r.text}</p>
                      <div>{renderStars(r.rating)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={styles.reviewFormCustom}>
              <textarea
                placeholder="Оставьте отзыв..."
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
              />
              <div className={styles.ratingStars}>
                {[...Array(5)].map((_, index) => {
                  const starValue = index + 1;
                  return (
                    <FaStar
                      key={index}
                      size={24}
                      style={{ cursor: 'pointer' }}
                      color={starValue <= (hoverRating || newReviewRating) ? '#ffbe5a' : '#ccc'}
                      onClick={() => setNewReviewRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                    />
                  );
                })}
              </div>
              <button onClick={handleAddReview}>Добавить отзыв</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <p>Загрузка данных пользователя...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      <header className={styles.header}>
        <Link to="/">
          <img src="/images/logosmall.svg" alt="IdeaFlow logo" style={{ height: 80 }} />
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

      <div className={styles.userInfo}>
        <div className={styles.photoWrapper}>
          {formData.photo ? (
            <img src={`http://localhost:3001${formData.photo}`} alt="User" className={styles.userPhoto} />
          ) : (
            <div className={styles.userPhotoPlaceholder}>Фото</div>
          )}
        </div>
        <div className={styles.infoDisplay}>
          <h1 className={styles.title}>
            {formData.firstName} {formData.lastName}
          </h1>
          <p>{formData.username}</p>
          <p>
            <b>О себе:</b> {formData.about || 'Нет информации'}
          </p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'projects' ? styles.active : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Проекты
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'cases' ? styles.active : ''}`}
            onClick={() => setActiveTab('cases')}
          >
            Кейсы
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.active : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Отзывы
          </button>
        </div>
        {renderTabContent()}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <img src="/images/logobig.svg" alt="Big Logo" />
          </div>
          <div className={styles.footerContacts}>
            Связаться с нами <br />
            <a href="mailto:support@ideaflow.com">support@ideaflow.com</a>
            <br />
            <p>+7 (123) 456-78-90</p>
          </div>
          <div className={styles.footerSocials}>
            <a href="#"><img src="/images/facebook.svg" alt="Facebook" /></a>
            <a href="#"><img src="/images/twitterx.svg" alt="Twitter" /></a>
            <a href="#"><img src="/images/instagram.svg" alt="Instagram" /></a>
          </div>
        </div>
        <p style={{ fontSize: 20, textAlign: 'center', marginTop: 10 }}>
          Место, где идеи превращаются в успешные проекты благодаря сотрудничеству заказчиков и фрилансеров.
        </p>
      </footer>
    </>
  );
}
