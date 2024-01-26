const APIURL = 'https://api.github.com/users/';
const repositoriesContainer = document.getElementById('repositories');
const paginationContainer = document.getElementById('pagination');
const usernameInput = document.getElementById('username');
const searchInput = document.getElementById('search');
let currentPage = 1;
const itemsPerPage = 9; 
let totalPages = 3;

async function fetchRepositories() {
    const username = usernameInput.value.trim();

    if (!username) {
        console.log("please type valid username");
        return;
    }

    // Show loader while fetching user data
    repositoriesContainer.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading user data...</span></div>';

    try {
        // Fetch user information from Github API
        const userResponse = await fetch(`${APIURL}${username}`);
        const userData = await userResponse.json();

        // Show loader while fetching repositories
        repositoriesContainer.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading repositories...</span></div>';

        // Fetch only the first 6 repositories from Github API based on the provided username
        const response = await fetch(`${APIURL}${username}/repos?page=${currentPage}&per_page=${itemsPerPage}`);
        const repositoriesData = await response.json();
        

        // Use Promise.all to wait for both user and repositories data to be fetched before proceeding
        await Promise.all([
            displayUserInformation(userData),
            displayRepositories(repositoriesData)
        ]);

        // Create and display pagination controls
        const totalPages = Math.ceil(repositoriesData.length / itemsPerPage);
        displayPagination(totalPages);
    } catch (error) {
        console.error('Error fetching data:', error);
        repositoriesContainer.innerHTML = '<p>Error fetching data. Please try again.</p>';
    }
};

function displayUserInformation(user) {
    const profileContainer = document.getElementById('profile');
    profileContainer.innerHTML = `
        <div class="profile-left">
            <img src="${user.avatar_url}" alt="Profile Image" class="img-fluid rounded-circle">
        </div>
        <div class="profile-right">
            <h2>${user.name || 'No Name'}</h2>
            <p>${user.bio || 'No bio available'}</p>
            <p>Location: ${user.location || 'Not specified'}</p>
            <p>Followers: ${user.followers}</p>
            <p>Following: ${user.following}</p>
            <p>Public Repositories: ${user.public_repos}</p>
            <p>Joined Github: ${new Date(user.created_at).toDateString()}</p>
            <div class="social-media">
                ${user.twitter_username ? `<a href="https://twitter.com/${user.twitter_username}" target="_blank" class="me-2">Twitter</a>` : ''}
                <a href="https://github.com/${user.login}" target="_blank" class="me-2">GitHub</a>
            </div>
        </div>
    `;
}

async function displayRepositories(repositories) {
    repositoriesContainer.innerHTML = '';

    if (repositories.length === 0) {
        repositoriesContainer.innerHTML = '<p>No repositories found.</p>';
        return;
    }

    try {
        const repoCardsPromises = repositories.map(repo => createRepoCard(repo));
        const repoCards = await Promise.all(repoCardsPromises);

        for (const repoCard of repoCards) {
            // Check if repoCard is a valid DOM element before appending
            if (repoCard instanceof Node) {
                repositoriesContainer.appendChild(repoCard);
            } else {
                console.error('Invalid repoCard:', repoCard);
            }
        }
    } catch (error) {
        console.error('Error displaying repositories:', error);
        repositoriesContainer.innerHTML = '<p>Error displaying repositories. Please try again.</p>';
    }
}

async function getRepoLanguages(contents) {
    if (!Array.isArray(contents)) {
       console.error("getRepoLanguages expects an array. Instead received:", contents);
       return [];
    }
   
    const repoLanguages = [];

    // Iterate over each content of the repository
    for (const content of contents) {
        try {
            const response = await fetch(content.languages_url);
            const languagesData = await response.json();
            
            // Extract language names from the response and add to repoLanguages
            const languages = Object.keys(languagesData);
            repoLanguages.push(...languages);
        } catch (error) {
            console.error('Error fetching languages for content:', content, error);
        }
    }

    return repoLanguages;
}

async function createRepoCard(repo) {
    try {
        const repoCard = document.createElement('div');
        repoCard.classList.add('col-md-6', 'mb-4');
        repoCard.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${repo.name}</h5>
                    <p class="card-text">${repo.description || 'No description available'}</p>
                    <div class="languages-container">
                        <p class="card-text">Languages:</p>
                        ${(await getRepoLanguages([repo])).length > 0 ? (await getRepoLanguages([repo])).map(language => `<span class="badge bg-secondary">${language}</span>`).join('') : 'No languages'}
                    </div>
                    <div class="topics-container">
                        <p class="card-text">Topics:</p>
                        ${(repo.topics || []).length > 0 ? repo.topics.map(topic => `<span class="badge bg-secondary">${topic}</span>`).join('') : 'No topics'}
                    </div>
                    <p class="card-text">Stars: ${repo.stargazers_count}</p>
                </div>
            </div>
        `;
        return repoCard;
    } catch (error) {
        console.error('Error creating repo card:', error);
        throw error;
    }
}




function displayPagination(totalPages) {
    if (totalPages > 1) {
        const paginationHTML = `
            <nav aria-label="Page navigation">
                <ul class="pagination">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                    ${Array.from({ length: totalPages }, (_, i) => i + 1).map(page => `
                        <li class="page-item ${page === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="changePage(${page})">${page}</a>
                        </li>
                    `).join('')}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        `;
        paginationContainer.innerHTML = paginationHTML;
    }
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        fetchRepositories();
    }
}

// Search functionality
searchInput.addEventListener('input', function () {
    const searchTerm = this.value.trim().toLowerCase();
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const repoName = card.querySelector('.card-title').innerText.toLowerCase();
        const repoDescription = card.querySelector('.card-text').innerText.toLowerCase();

        if (repoName.includes(searchTerm) || repoDescription.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

searchInput.addEventListener('keydown', function (event) {
    if (event.key === "Enter") {
        fetchRepositories();
    }
});

// Initial load 
fetchRepositories();