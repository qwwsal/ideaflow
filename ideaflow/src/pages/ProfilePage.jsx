import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();

  // Использовать userId из параметра роутинга, если есть, иначе из localStorage (для своего профиля)
  const [userId, setUserId] = useState(paramUserId || localStorage.getItem('userId'));
  const [userEmail, setUserEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
  const [selectedFiles, setSelectedFiles] = useState({});

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

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/');
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('photo', file);
    try {
      const response = await fetch('http://localhost:3001/upload-photo', {
        method: 'POST',
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка загрузки фото');
      setFormData(prev => ({ ...prev, photo: result.photoPath }));
    } catch (err) {
      alert('Ошибка загрузки фото: ' + err.message);
    }
  };

  const toggleEdit = () => setIsEditing(!isEditing);

  const handleSave = async e => {
    e.preventDefault();
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:3001/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          photo: formData.photo,
          description: formData.about,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Ошибка при сохранении');
      }
      alert('Данные успешно сохранены');
      setIsEditing(false);
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message);
    }
  };

  const handleFileSelect = (caseId, e) => {
    const files = e.target.files;
    setSelectedFiles(prev => ({ ...prev, [caseId]: files }));
  };

  const handleAddFiles = async (caseId) => {
    const files = selectedFiles[caseId];
    if (!files || files.length === 0) {
      alert('Выберите файлы для добавления');
      return;
    }
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('extraFiles', file);
    });

    try {
      const response = await fetch(`http://localhost:3001/processed-cases/${caseId}/upload-files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Ошибка добавления файлов');
      }

      const result = await response.json();
      alert('Файлы успешно добавлены');

      // Обновляем текущие кейсы исполнителя
      const resCases = await fetch(`http://localhost:3001/processed-cases`);
      const updatedCases = await resCases.json();
      setInProcessExecutorCases(updatedCases.filter(c => c.executorId === Number(userId) && c.status === 'in_process'));
      setSelectedFiles(prev => ({ ...prev, [caseId]: null }));
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleCompleteCase = async caseId => {
    try {
      const response = await fetch(`http://localhost:3001/processed-cases/${caseId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка завершения кейса');
      alert('Кейс завершён и добавлен в проекты');

      // Обновляем списки кейсов и проектов
      const resCases = await fetch(`http://localhost:3001/processed-cases`);
      const dataCases = await resCases.json();
      const resProjects = await fetch(`http://localhost:3001/projects`);
      const dataProjects = await resProjects.json();

      const filteredCases = dataCases.filter(c => c.executorId === Number(userId) && c.status === 'in_process');
      const filteredProjects = dataProjects.filter(p => p.executorId === Number(userId) && p.status === 'closed');

      setInProcessExecutorCases(filteredCases);
      setCompletedExecutorProjects(filteredProjects);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

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
                  <img src={r.reviewerPhoto} alt={r.reviewerName} />
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
    </div>
  );

      // case 'reviews':
      //   return (
      //     <div className={styles.reviewContainer}>
      //       <h3>
      //         Отзывы пользователя{' '}
      //         <span style={{ fontFamily: 'Arial', fontWeight: 'normal', fontSize: '1rem', marginLeft: '10px' }}>
      //           ({averageRating} ★)
      //         </span>
      //       </h3>
      //       <div className={styles.reviewListCustom}>
      //         {reviews.length === 0 ? (
      //           <p>Пока нет отзывов</p>
      //         ) : (
      //           reviews.map((r) => (
      //             <div key={r.id} className={styles.reviewItemCustom}>
      //               <div className={styles.reviewPhotoCustom}>
      //                 {r.reviewerPhoto ? (
      //                   <img src={r.reviewerPhoto} alt={r.reviewerName} />
      //                 ) : (
      //                   <div className={styles.userPhotoPlaceholderCustom}></div>
      //                 )}
      //               </div>
      //               <div>
      //                 <b>{r.reviewerName}</b>
      //                 <p>{r.text}</p>
      //                 <div>{renderStars(r.rating)}</div>
      //               </div>
      //             </div>
      //           ))
      //         )}
      //       </div>
      //       <div className={styles.reviewFormCustom}>
      //         <textarea
      //           placeholder="Оставьте отзыв..."
      //           value={newReviewText}
      //           onChange={(e) => setNewReviewText(e.target.value)}
      //         />
      //         <div className={styles.ratingStars}>
      //           {[...Array(5)].map((_, index) => {
      //             const starValue = index + 1;
      //             return (
      //               <FaStar
      //                 key={index}
      //                 size={24}
      //                 style={{ cursor: 'pointer' }}
      //                 color={starValue <= (hoverRating || newReviewRating) ? '#ffbe5a' : '#ccc'}
      //                 onClick={() => setNewReviewRating(starValue)}
      //                 onMouseEnter={() => setHoverRating(starValue)}
      //                 onMouseLeave={() => setHoverRating(0)}
      //               />
      //             );
      //           })}
      //         </div>
      //         <button onClick={handleAddReview}>Добавить отзыв</button>
      //       </div>
      //     </div>
      //   );
      default:
        return null;
    }
  };

  if (loading) return <p>Загрузка данных пользователя...</p>;
  
  if (error) {
    // Показать ошибку и сразу перейти на вход
    setTimeout(() => {
      navigate('/signin');
    }, 1500);
    return <p style={{ color: 'red' }}>{error}</p>;
  }

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

      <div className={styles.centerWrapper}>
        <div className={styles.userInfo}>
          <div className={styles.photoWrapper} title="Выберите фото профиля">
            {formData.photo ? (
              <img src={`http://localhost:3001${formData.photo}`} alt="User" className={styles.userPhoto} />
            ) : (
              <div className={styles.userPhotoPlaceholder}>Фото</div>
            )}
            {isEditing && (
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className={styles.fileInput}
                title="Выберите фото"
              />
            )}
          </div>

          {isEditing ? (
            <form className={styles.editForm} onSubmit={handleSave}>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Имя"
                className={styles.editInput}
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Фамилия"
                className={styles.editInput}
              />
              <input
                type="text"
                name="username"
                value={formData.username}
                readOnly
                placeholder="Юзернейм"
                className={styles.editInput}
                title="Юзернейм соответствует вашему email"
              />
              <textarea
                name="about"
                value={formData.about}
                onChange={handleInputChange}
                placeholder="Информация о себе"
                className={styles.editTextarea}
              />
              <button type="submit" className={styles.saveButton}>Сохранить</button>
              <button type="button" className={styles.cancelButton} onClick={toggleEdit}>Отмена</button>
            </form>
          ) : (
            <div className={styles.infoDisplay}>
              <h1 className={styles.title}>{formData.firstName} {formData.lastName}</h1>
              <p>{formData.username}</p>
              <p><b>О себе:</b> {formData.about || 'Нет информации'}</p>
              <button className={styles.editButton} onClick={toggleEdit}>Изменить информацию</button>
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.actionButton1} onClick={() => navigate('/add-case')}>
            Разместить проект
          </button>
          <button className={styles.actionButton2} onClick={() => navigate('/cases')}>
            Приступить к проекту
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Выйти из профиля
          </button>
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

      <div className={styles.processedCase}>
        <h3>Текущие кейсы в процессе</h3>
        {inProcessExecutorCases.length === 0 ? (
          <p>Нет текущих кейсов</p>
        ) : (
          <div className={styles.casesGrid}>
            {inProcessExecutorCases.map(c => (
              <div key={c.id} className={styles.caseCard}>
                <Link to={`/processed-cases/${c.id}`} className={styles.caseLink}>
                  <img
                    src={`http://localhost:3001${c.cover || ''}`}
                    alt={`Фото заказчика ${c.userEmail}`}
                    className={styles.caseImage}
                  />
                  <div className={styles.caseInfo}>
                    <div className={styles.casePerformer}>{c.userEmail || 'Не указан'}</div>
                    <div className={styles.caseTopic}>{c.theme}</div>
                    <div className={styles.caseTitle}>{c.title}</div>
                  </div>
                </Link>
                <div style={{ marginTop: 10 }}>
                  <input type="file" multiple onChange={(e) => handleFileSelect(c.id, e)} />
                  <button onClick={() => handleAddFiles(c.id)}>Дополнить</button>
                  <button onClick={() => handleCompleteCase(c.id)}>Готово</button>
                </div>
              </div>
            ))}
          </div>
        )}
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
